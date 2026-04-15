import { Professional, User, Patient, PatientProfessional, Appointment, Prescription, MedicalRecord, Study, Office, Schedule } from '../database/models/index.js';
import officeBlockService from './officeBlockService.js'; // ✅ NUEVO
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class ProfessionalService {
	async search(query, filters = {}) {
		const { specialty, coverage } = filters;

		const whereClause = {};

		if (specialty) {
			whereClause.specialty = { [Op.iLike]: `%${specialty}%` };
		}

		if (coverage) {
			whereClause.acceptedCoverages = { [Op.contains]: [coverage] };
		}

		const professionals = await Professional.findAll({
			where: whereClause,
			include: [
				{
					association: 'user',
					attributes: ['id', 'email', 'name', 'lastName', 'phone'],
					where: query
						? {
							[Op.or]: [
								{ name: { [Op.iLike]: `%${query}%` } },
								{ lastName: { [Op.iLike]: `%${query}%` } },
							],
						}
						: {},
				},
			],
		});

		return professionals;
	}

	async getById(professionalId) {
		const professional = await Professional.findByPk(professionalId, {
			attributes: { exclude: ['signature'] },
			include: [
				{
					association: 'user',
					attributes: ['id', 'email', 'name', 'lastName', 'phone'],
				},
				{
					association: 'offices',
					include: [
						{
							model: Schedule,
							as: 'schedules',
							where: { isActive: true },
							required: false,
						},
					],
				},
			],
		});

		if (!professional) {
			throw new ApiError(404, 'Profesional no encontrado.');
		}

		return professional;
	}

	async updateProfile(professionalId, updateData) {
		const professional = await Professional.findByPk(professionalId);

		if (!professional) {
			throw new ApiError(404, 'Profesional no encontrado.');
		}

		const { specialty, licenseNumber, acceptedCoverages, fees } = updateData;

		await professional.update({
			specialty,
			licenseNumber,
			acceptedCoverages,
			fees,
		});

		// Actualizar datos del usuario si vienen
		if (updateData.name || updateData.lastName || updateData.phone) {
			await User.update(
				{
					name: updateData.name,
					lastName: updateData.lastName,
					phone: updateData.phone,
				},
				{ where: { id: professional.userId } }
			);
		}

		return await this.getById(professionalId);
	}

	async addToPatientTeam(patientId, professionalId) {
		const [relationship, created] = await PatientProfessional.findOrCreate({
			where: { patientId, professionalId },
		});

		if (!created) {
			throw new ApiError(400, 'Este profesional ya está en tu equipo.');
		}

		return relationship;
	}

	async removeFromPatientTeam(patientId, professionalId) {
		const deleted = await PatientProfessional.destroy({
			where: { patientId, professionalId },
		});

		if (!deleted) {
			throw new ApiError(404, 'Relación no encontrada.');
		}

		return { success: true };
	}

	async getPatientProfessionals(patientId) {
		const professionals = await Professional.findAll({
			include: [
				{
					association: 'patients',
					where: { id: patientId },
					attributes: [],
				},
				{
					association: 'user',
					attributes: ['id', 'name', 'lastName', 'email', 'phone'],
				},
			],
		});

		return professionals;
	}

	/**
	 * Obtener todos los pacientes de un profesional
	 * con estadísticas y último turno
	 */
	async getProfessionalPatients(professionalId) {
		const patientsData = await sequelize.query(
			`
			SELECT DISTINCT
				p.id,
				p.user_id,
				p.birth_date,
				p.gender,
				p.blood_type,
				p.medical_coverage,
				p.coverage_number,
				u.name,
				u.last_name,
				u.email,
				u.phone,
				(
					SELECT COUNT(*)
					FROM appointments a
					WHERE a.patient_id = p.id
					AND a.professional_id = :professionalId
				) as total_appointments,
				(
					SELECT COUNT(*)
					FROM medical_records mr
					WHERE mr.patient_id = p.id
					AND mr.professional_id = :professionalId
				) as total_records,
				(
					SELECT COUNT(*)
					FROM prescriptions pr
					WHERE pr.patient_id = p.id
					AND pr.professional_id = :professionalId
				) as total_prescriptions,
				(
					SELECT date
					FROM appointments a
					WHERE a.patient_id = p.id
					AND a.professional_id = :professionalId
					ORDER BY a.date DESC, a.time DESC
					LIMIT 1
				) as last_appointment_date,
				(
					SELECT status
					FROM appointments a
					WHERE a.patient_id = p.id
					AND a.professional_id = :professionalId
					ORDER BY a.date DESC, a.time DESC
					LIMIT 1
				) as last_appointment_status
			FROM patients p
			INNER JOIN users u ON p.user_id = u.id
			WHERE p.id IN (
				SELECT DISTINCT patient_id FROM appointments WHERE professional_id = :professionalId
				UNION
				SELECT DISTINCT patient_id FROM prescriptions WHERE professional_id = :professionalId
				UNION
				SELECT DISTINCT patient_id FROM medical_records WHERE professional_id = :professionalId
				UNION
				SELECT DISTINCT patient_id FROM studies WHERE professional_id = :professionalId
			)
			ORDER BY u.last_name, u.name
			`,
			{
				replacements: { professionalId },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		return patientsData.map(patient => ({
			id: patient.id,
			userId: patient.user_id,
			birthDate: patient.birth_date,
			gender: patient.gender,
			bloodType: patient.blood_type,
			medicalCoverage: patient.medical_coverage,
			coverageNumber: patient.coverage_number,
			user: {
				name: patient.name,
				lastName: patient.last_name,
				email: patient.email,
				phone: patient.phone,
			},
			stats: {
				totalAppointments: parseInt(patient.total_appointments) || 0,
				totalRecords: parseInt(patient.total_records) || 0,
				totalPrescriptions: parseInt(patient.total_prescriptions) || 0,
				lastAppointmentDate: patient.last_appointment_date,
				lastAppointmentStatus: patient.last_appointment_status,
			},
		}));
	}

	/**
	 * Obtener un paciente específico del profesional
	 * con toda su información médica relacionada
	 */
	async getProfessionalPatient(professionalId, patientId) {
		const hasRelation = await sequelize.query(
			`
			SELECT 1
			FROM (
				SELECT patient_id FROM appointments WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
				SELECT patient_id FROM prescriptions WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
				SELECT patient_id FROM medical_records WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
				SELECT patient_id FROM studies WHERE professional_id = :professionalId AND patient_id = :patientId
			) AS relations
			LIMIT 1
			`,
			{
				replacements: { professionalId, patientId },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		if (!hasRelation || hasRelation.length === 0) {
			throw new ApiError(404, 'Paciente no encontrado o sin relación con este profesional.');
		}

		const patient = await Patient.findByPk(patientId, {
			include: [
				{
					association: 'user',
					attributes: ['id', 'email', 'name', 'lastName', 'phone'],
				},
				{ association: 'healthInfo' },
			],
		});

		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		const medicalRecords = await MedicalRecord.findAll({
			where: { patientId, professionalId },
			order: [['date', 'DESC']],
			limit: 10,
		});

		const prescriptions = await Prescription.findAll({
			where: { patientId, professionalId },
			order: [['createdAt', 'DESC']],
			limit: 10,
		});

		const studies = await Study.findAll({
			where: { patientId },
			order: [['date', 'DESC']],
		});

		const appointments = await Appointment.findAll({
			where: { patientId, professionalId },
			include: [
				{
					association: 'office',
					attributes: ['id', 'name', 'address'],
				},
			],
			order: [['date', 'DESC'], ['time', 'DESC']],
			limit: 10,
		});

		return {
			...patient.toJSON(),
			medicalRecords,
			prescriptions,
			studies,
			appointments,
		};
	}

	/**
	 * Obtener disponibilidad del profesional
	 * Devuelve consultorios con horarios, turnos ocupados y bloqueos
	 */
	async getProfessionalAvailability(professionalId, startDate, endDate) {
		const offices = await Office.findAll({
			where: { professionalId },
			include: [
				{
					association: 'schedules',
					where: { isActive: true },
					required: false,
					order: [['dayOfWeek', 'ASC']],
				},
			],
		});

		const whereClause = {
			professionalId,
			status: { [Op.in]: ['pending', 'confirmed'] },
		};

		if (startDate && endDate) {
			whereClause.date = { [Op.between]: [startDate, endDate] };
		} else if (startDate) {
			whereClause.date = { [Op.gte]: startDate };
		}

		const appointments = await Appointment.findAll({
			where: whereClause,
			attributes: ['id', 'officeId', 'date', 'time', 'duration'],
			order: [['date', 'ASC'], ['time', 'ASC']],
		});

		// ✅ NUEVO: Obtener bloqueos para que el frontend oculte esos slots
		const blocks = await officeBlockService.getByProfessional(professionalId, {
			startDate,
			endDate,
		});

		return {
			offices: offices.map(office => ({
				id: office.id,
				name: office.name,
				address: office.address,
				phone: office.phone,
				appointmentDuration: office.appointmentDuration,
				schedules: office.schedules || [],
			})),
			appointments: appointments.map(apt => ({
				id: apt.id,
				officeId: apt.officeId,
				date: apt.date,
				time: apt.time,
				duration: apt.duration,
			})),
			// ✅ NUEVO: El frontend usa esto para ocultar días/slots bloqueados
			blocks: blocks.map(block => ({
				id: block.id,
				officeId: block.officeId,
				date: block.date,
				type: block.type,          // 'full_day' | 'time_range'
				startTime: block.startTime, // null si full_day
				endTime: block.endTime,     // null si full_day
				reason: block.reason,
			})),
		};
	}
}

export default new ProfessionalService();