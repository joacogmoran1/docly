import { Prescription, Patient, Professional, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

class PrescriptionService {
	async create(prescriptionData) {
		const { patientId, professionalId, medications, diagnosis, instructions, validUntil } = prescriptionData;

		const prescription = await Prescription.create({
			patientId,
			professionalId,
			medications,
			diagnosis,
			instructions,
			validUntil,
		});

		return await this.getById(prescription.id);
	}

	async getById(prescriptionId) {
		const prescription = await Prescription.findByPk(prescriptionId, {
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName', 'email'] }],
				},
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
		});

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		return prescription;
	}

	async getByPatient(patientId, filters = {}) {
		const whereClause = { patientId };

		// Filtro por profesional
		if (filters.professionalId) {
			whereClause.professionalId = filters.professionalId;
		}

		// Filtro por validez
		if (filters.valid === 'true') {
			whereClause.validUntil = {
				[Op.gte]: new Date(),
			};
		}

		// Búsqueda por medicamento
		if (filters.search) {
			whereClause[Op.or] = [
				{ diagnosis: { [Op.iLike]: `%${filters.search}%` } },
				{ instructions: { [Op.iLike]: `%${filters.search}%` } },
			];
		}

		const prescriptions = await Prescription.findAll({
			where: whereClause,
			include: [
				{
					association: 'professional',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['createdAt', 'DESC']],
		});

		return prescriptions;
	}

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		// Filtro por paciente
		if (filters.patientId) {
			whereClause.patientId = filters.patientId;
		}

		const prescriptions = await Prescription.findAll({
			where: whereClause,
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
			],
			order: [['createdAt', 'DESC']],
		});

		return prescriptions;
	}

	async update(prescriptionId, updateData) {
		const prescription = await Prescription.findByPk(prescriptionId);

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		const { medications, diagnosis, instructions, validUntil } = updateData;

		await prescription.update({
			medications,
			diagnosis,
			instructions,
			validUntil,
		});

		return await this.getById(prescriptionId);
	}

	async delete(prescriptionId) {
		const prescription = await Prescription.findByPk(prescriptionId);

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		await prescription.destroy();

		return { success: true };
	}
}

export default new PrescriptionService();
