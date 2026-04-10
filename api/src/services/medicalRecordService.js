import { MedicalRecord, Patient, Professional, Appointment, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

class MedicalRecordService {
	async create(recordData) {
		const { patientId, professionalId, appointmentId, date, diagnosis, treatment, notes, vitalSigns } = recordData;

		const record = await MedicalRecord.create({
			patientId,
			professionalId,
			appointmentId,
			date: date || new Date(),
			diagnosis,
			treatment,
			notes,
			vitalSigns,
		});

		return await this.getById(record.id);
	}

	async getById(recordId) {
		const record = await MedicalRecord.findByPk(recordId, {
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName', 'specialty'] }],
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

		// Filtro por profesional
		if (filters.professionalId) {
			whereClause.professionalId = filters.professionalId;
		}

		// Filtro por rango de fechas
		if (filters.startDate || filters.endDate) {
			whereClause.date = {};
			if (filters.startDate) {
				whereClause.date[Op.gte] = filters.startDate;
			}
			if (filters.endDate) {
				whereClause.date[Op.lte] = filters.endDate;
			}
		}

		// Búsqueda en diagnóstico o tratamiento
		if (filters.search) {
			whereClause[Op.or] = [
				{ diagnosis: { [Op.iLike]: `%${filters.search}%` } },
				{ treatment: { [Op.iLike]: `%${filters.search}%` } },
				{ notes: { [Op.iLike]: `%${filters.search}%` } },
			];
		}

		const records = await MedicalRecord.findAll({
			where: whereClause,
			include: [
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['date', 'DESC']],
		});

		return records;
	}

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		// Filtro por paciente
		if (filters.patientId) {
			whereClause.patientId = filters.patientId;
		}

		// Filtro por fecha
		if (filters.date) {
			whereClause.date = filters.date;
		}

		const records = await MedicalRecord.findAll({
			where: whereClause,
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['date', 'DESC']],
		});

		return records;
	}

	async update(recordId, updateData) {
		const record = await MedicalRecord.findByPk(recordId);

		if (!record) {
			throw new ApiError(404, 'Registro médico no encontrado.');
		}

		const { diagnosis, treatment, notes, vitalSigns } = updateData;

		await record.update({
			diagnosis,
			treatment,
			notes,
			vitalSigns,
		});

		return await this.getById(recordId);
	}

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
