import { Professional, User, Patient, PatientProfessional, Appointment, Prescription, MedicalRecord, Study, Office, Schedule } from '../database/models/index.js';
import officeBlockService from './officeBlockService.js';
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

		// Calcular next available para cada profesional
		const results = await Promise.all(
			professionals.map(async (prof) => {
				const plain = prof.toJSON();
				plain.nextAvailable = await this._calculateNextAvailable(prof.id, prof.offices || []);
				return plain;
			})
		);

		return results;
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

		// Calcular next available
		const plain = professional.toJSON();
		plain.nextAvailable = await this._calculateNextAvailable(professionalId, professional.offices || []);

		return plain;
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
		const [patient, professional] = await Promise.all([
			Patient.findByPk(patientId),
			Professional.findByPk(professionalId),
		]);

		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		if (!professional) {
			throw new ApiError(404, 'Profesional no encontrado.');
		}

		const [relationship, created] = await PatientProfessional.findOrCreate({
			where: { patientId, professionalId },
		});

		if (!created) {
			throw new ApiError(400, 'Este profesional ya está en tu equipo.');
		}

		return relationship;
	}

	async removeFromPatientTeam(patientId, professionalId) {
		const [patient, professional] = await Promise.all([
			Patient.findByPk(patientId),
			Professional.findByPk(professionalId),
		]);

		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		if (!professional) {
			throw new ApiError(404, 'Profesional no encontrado.');
		}

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

		// Calcular next available para cada profesional
		const results = await Promise.all(
			professionals.map(async (prof) => {
				const plain = prof.toJSON();
				plain.nextAvailable = await this._calculateNextAvailable(prof.id, prof.offices || []);
				return plain;
			})
		);

		return results;
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
				p.dni,
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
				SELECT DISTINCT patient_id FROM patient_professionals WHERE professional_id = :professionalId
				UNION
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
			dni: patient.dni,
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
				SELECT patient_id FROM patient_professionals WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
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
			where: {
				patientId,
				[Op.or]: [
					{ professionalId },
					{ professionalId: null },
				],
			},
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
	async getProfessionalAvailability(professionalId, startDate, endDate, options = {}) {
		const { includeSensitive = false } = options;
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
				id: includeSensitive ? apt.id : `busy-${apt.officeId}-${apt.date}-${apt.time}`,
				officeId: apt.officeId,
				date: apt.date,
				time: apt.time,
				duration: apt.duration,
			})),
			blocks: blocks.map(block => ({
				id: includeSensitive
					? block.id
					: `block-${block.officeId}-${block.date}-${block.type}-${block.startTime ?? 'day'}-${block.endTime ?? 'end'}`,
				officeId: block.officeId,
				date: block.date,
				type: block.type,
				startTime: block.startTime,
				endTime: block.endTime,
				reason: includeSensitive ? block.reason : null,
			})),
		};
	}

	// =========================================================================
	// CALCULAR PRÓXIMO TURNO DISPONIBLE
	// =========================================================================

	/**
	 * Calcula el próximo slot libre de un profesional mirando sus consultorios,
	 * horarios, turnos existentes y bloqueos. Busca hasta 30 días en el futuro.
	 *
	 * Retorna ISO string del próximo slot libre, o null si no hay disponibilidad.
	 */
	async _calculateNextAvailable(professionalId, offices) {
		try {
			if (!offices || offices.length === 0) return null;

			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const maxDate = new Date(today);
			maxDate.setDate(maxDate.getDate() + 30);

			const todayStr = this._formatDate(today);
			const maxDateStr = this._formatDate(maxDate);

			// Obtener turnos activos en el rango
			const activeAppointments = await Appointment.findAll({
				where: {
					professionalId,
					status: { [Op.in]: ['pending', 'confirmed'] },
					date: { [Op.between]: [todayStr, maxDateStr] },
				},
				attributes: ['officeId', 'date', 'time', 'duration'],
				raw: true,
			});

			// Obtener bloqueos en el rango
			const blocks = await officeBlockService.getByProfessional(professionalId, {
				startDate: todayStr,
				endDate: maxDateStr,
			});

			// Indexar turnos y bloqueos por officeId+date para lookup rápido
			const appointmentIndex = new Map();
			for (const apt of activeAppointments) {
				const key = `${apt.officeId}:${apt.date}`;
				if (!appointmentIndex.has(key)) appointmentIndex.set(key, []);
				appointmentIndex.get(key).push(apt.time.slice(0, 5));
			}

			const fullDayBlocks = new Set();
			const timeRangeBlocks = new Map();
			for (const block of blocks) {
				const key = `${block.officeId}:${block.date}`;
				if (block.type === 'full_day') {
					fullDayBlocks.add(key);
				} else if (block.startTime && block.endTime) {
					if (!timeRangeBlocks.has(key)) timeRangeBlocks.set(key, []);
					timeRangeBlocks.get(key).push({
						start: block.startTime.slice(0, 5),
						end: block.endTime.slice(0, 5),
					});
				}
			}

			// Iterar día por día, consultorio por consultorio
			for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
				const dateStr = this._formatDate(d);
				const jsDayOfWeek = d.getDay();

				for (const office of offices) {
					const schedules = (office.schedules || office.dataValues?.schedules || [])
						.filter(s => s.isActive && s.dayOfWeek === jsDayOfWeek);

					if (!schedules.length) continue;

					const key = `${office.id}:${dateStr}`;
					if (fullDayBlocks.has(key)) continue;

					const bookedTimes = new Set(appointmentIndex.get(key) || []);
					const blockedRanges = timeRangeBlocks.get(key) || [];

					for (const schedule of schedules) {
						const slots = this._buildTimeSlots(
							schedule.startTime,
							schedule.endTime,
							office.appointmentDuration || 30,
						);

						for (const slot of slots) {
							// Skip si es hoy y el slot ya pasó
							if (dateStr === todayStr) {
								const slotTime = new Date(`${dateStr}T${slot}:00`);
								if (slotTime <= now) continue;
							}

							if (bookedTimes.has(slot)) continue;

							const isBlocked = blockedRanges.some(
								range => slot >= range.start && slot < range.end
							);
							if (isBlocked) continue;

							// Encontramos el primer slot libre
							return `${dateStr}T${slot}:00`;
						}
					}
				}
			}

			return null;
		} catch (error) {
			// No fallar la operación padre por un cálculo secundario
			return null;
		}
	}

	_formatDate(date) {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	_buildTimeSlots(startTime, endTime, durationMinutes) {
		const result = [];
		const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
		const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
		const start = sh * 60 + sm;
		const end = eh * 60 + em;

		for (let cur = start; cur + durationMinutes <= end; cur += durationMinutes) {
			const h = Math.floor(cur / 60);
			const m = cur % 60;
			result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
		}

		return result;
	}
}

export default new ProfessionalService();
