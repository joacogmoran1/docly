import { MedicalRecord, Patient, Professional, Appointment, User, PatientProfessional } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

// Campos editables — whitelist estricta
const ALLOWED_CREATE_FIELDS = [
	'patientId', 'professionalId', 'appointmentId', 'date',
	'reason', 'diagnosis', 'indications', 'evolution', 'nextCheckup', 'vitalSigns',
];

const ALLOWED_UPDATE_FIELDS = [
	'reason', 'diagnosis', 'indications', 'evolution', 'nextCheckup', 'vitalSigns',
];

function pickFields(source, allowed) {
	const result = {};
	for (const key of allowed) {
		if (source[key] !== undefined) {
			result[key] = source[key];
		}
	}
	return result;
}

class MedicalRecordService {
	// =========================================================================
	// CREAR
	// =========================================================================

	async create(recordData) {
		const data = pickFields(recordData, ALLOWED_CREATE_FIELDS);

		// Verificar que el paciente existe
		const patient = await Patient.findByPk(data.patientId);
		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		// Verificar que el profesional existe
		const professional = await Professional.findByPk(data.professionalId);
		if (!professional) {
			throw new ApiError(404, 'Profesional no encontrado.');
		}

		// Si se vincula a un turno, verificar que existe y pertenece al mismo paciente/profesional
		if (data.appointmentId) {
			const appointment = await Appointment.findByPk(data.appointmentId);
			if (!appointment) {
				throw new ApiError(404, 'Turno no encontrado.');
			}
			if (appointment.patientId !== data.patientId || appointment.professionalId !== data.professionalId) {
				throw new ApiError(400, 'El turno no corresponde al paciente/profesional indicado.');
			}
		}

		const record = await MedicalRecord.create({
			...data,
			date: data.date || new Date(),
		});

		await PatientProfessional.findOrCreate({
			where: { patientId: data.patientId, professionalId: data.professionalId },
		});

		return await this.getById(record.id);
	}

	// =========================================================================
	// LEER
	// =========================================================================

	async getById(recordId) {
		const record = await MedicalRecord.findByPk(recordId, {
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
				{
					association: 'professional',
					attributes: ['id', 'specialty'],
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
				{
					association: 'appointment',
					attributes: ['id', 'date', 'time'],
					required: false,
				},
			],
		});

		if (!record) {
			throw new ApiError(404, 'Registro médico no encontrado.');
		}

		return record;
	}

	async getByPatient(patientId, filters = {}) {
		const whereClause = { patientId };

		if (filters.professionalId) {
			whereClause.professionalId = filters.professionalId;
		}

		if (filters.startDate || filters.endDate) {
			whereClause.date = {};
			if (filters.startDate) whereClause.date[Op.gte] = filters.startDate;
			if (filters.endDate) whereClause.date[Op.lte] = filters.endDate;
		}

		if (filters.search) {
			whereClause[Op.or] = [
				{ reason: { [Op.iLike]: `%${filters.search}%` } },
				{ diagnosis: { [Op.iLike]: `%${filters.search}%` } },
				{ indications: { [Op.iLike]: `%${filters.search}%` } },
				{ evolution: { [Op.iLike]: `%${filters.search}%` } },
			];
		}

		return await MedicalRecord.findAll({
			where: whereClause,
			include: [
				{
					association: 'professional',
					attributes: ['id', 'specialty'],
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['date', 'DESC']],
		});
	}

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		if (filters.patientId) whereClause.patientId = filters.patientId;
		if (filters.date) whereClause.date = filters.date;

		return await MedicalRecord.findAll({
			where: whereClause,
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['date', 'DESC']],
		});
	}

	// =========================================================================
	// ACTUALIZAR
	// =========================================================================

	async update(recordId, updateData) {
		const record = await MedicalRecord.findByPk(recordId);

		if (!record) {
			throw new ApiError(404, 'Registro médico no encontrado.');
		}

		// Solo campos permitidos, ignorar cualquier otro
		const data = pickFields(updateData, ALLOWED_UPDATE_FIELDS);

		await record.update(data);

		return await this.getById(recordId);
	}

	// =========================================================================
	// ELIMINAR
	// =========================================================================

	async delete(recordId) {
		const record = await MedicalRecord.findByPk(recordId);

		if (!record) {
			throw new ApiError(404, 'Registro médico no encontrado.');
		}

		await record.destroy();

		return { success: true };
	}
}

export default new MedicalRecordService();
