import { Study, Patient, Professional, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

class StudyService {
	async create(studyData) {
		const { patientId, professionalId, type, date, results, fileUrl, notes } = studyData;

		const study = await Study.create({
			patientId,
			professionalId,
			type,
			date,
			results,
			fileUrl,
			notes,
		});

		return await this.getById(study.id);
	}

	async getById(studyId) {
		const study = await Study.findByPk(studyId, {
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
					required: false, // Puede ser null
				},
			],
		});

		if (!study) {
			throw new ApiError(404, 'Estudio no encontrado.');
		}

		return study;
	}

	async getByPatient(patientId, filters = {}) {
		const whereClause = { patientId };

		// Filtro por profesional
		if (filters.professionalId) {
			whereClause.professionalId = filters.professionalId;
		}

		// Filtro por tipo de estudio
		if (filters.type) {
			whereClause.type = { [Op.iLike]: `%${filters.type}%` };
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

		const studies = await Study.findAll({
			where: whereClause,
			include: [
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
					required: false,
				},
			],
			order: [['date', 'DESC']],
		});

		return studies;
	}

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		// Filtro por paciente
		if (filters.patientId) {
			whereClause.patientId = filters.patientId;
		}

		const studies = await Study.findAll({
			where: whereClause,
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['date', 'DESC']],
		});

		return studies;
	}

	async update(studyId, updateData) {
		const study = await Study.findByPk(studyId);

		if (!study) {
			throw new ApiError(404, 'Estudio no encontrado.');
		}

		const { type, date, results, fileUrl, notes } = updateData;

		await study.update({
			type,
			date,
			results,
			fileUrl,
			notes,
		});

		return await this.getById(studyId);
	}

	async delete(studyId) {
		const study = await Study.findByPk(studyId);

		if (!study) {
			throw new ApiError(404, 'Estudio no encontrado.');
		}

		await study.destroy();

		return { success: true };
	}
}

export default new StudyService();
