import { Op } from 'sequelize';
import { Patient, HealthInfo, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';

class PatientService {
	async search(query, professionalId) {
		const normalizedQuery = query?.trim();

		if (!normalizedQuery || !professionalId) {
			return [];
		}

		const term = `%${normalizedQuery}%`;

		return await Patient.findAll({
			where: {
				[Op.or]: [
					{ dni: { [Op.iLike]: term } },
					{ medicalCoverage: { [Op.iLike]: term } },
					{ coverageNumber: { [Op.iLike]: term } },
					{ '$user.name$': { [Op.iLike]: term } },
					{ '$user.lastName$': { [Op.iLike]: term } },
					{ '$user.email$': { [Op.iLike]: term } },
					{ '$user.phone$': { [Op.iLike]: term } },
				],
			},
			include: [
				{
					association: 'user',
					attributes: ['id', 'email', 'name', 'lastName', 'phone'],
					where: {
						role: 'patient',
						isActive: true,
					},
				},
				{
					association: 'professionals',
					attributes: [],
					through: { attributes: [] },
					where: { id: professionalId },
				},
			],
			order: [
				[{ model: User, as: 'user' }, 'lastName', 'ASC'],
				[{ model: User, as: 'user' }, 'name', 'ASC'],
			],
			limit: 20,
		});
	}

	async getProfile(patientId) {
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

		return patient;
	}

	async updateProfile(patientId, updateData) {
		const patient = await Patient.findByPk(patientId);

		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		// Actualizar datos del paciente
		const { dni, birthDate, gender, bloodType, medicalCoverage, coverageNumber } = updateData;

		await patient.update({
			dni,
			birthDate,
			gender,
			bloodType,
			medicalCoverage,
			coverageNumber,
		});

		// Si hay datos del usuario (nombre, teléfono, etc.)
		if (updateData.name || updateData.lastName || updateData.phone) {
			await User.update(
				{
					name: updateData.name,
					lastName: updateData.lastName,
					phone: updateData.phone,
				},
				{ where: { id: patient.userId } }
			);
		}

		return await this.getProfile(patientId);
	}

	async getHealthInfo(patientId) {
		let healthInfo = await HealthInfo.findOne({ where: { patientId } });

		// Si no existe, crear uno vacío
		if (!healthInfo) {
			healthInfo = await HealthInfo.create({ patientId });
		}

		return healthInfo;
	}

	async updateHealthInfo(patientId, healthData) {
		const { diseases, allergies, medications } = healthData;

		let healthInfo = await HealthInfo.findOne({ where: { patientId } });

		if (healthInfo) {
			await healthInfo.update({ diseases, allergies, medications });
		} else {
			healthInfo = await HealthInfo.create({
				patientId,
				diseases,
				allergies,
				medications,
			});
		}

		return healthInfo;
	}
}

export default new PatientService();
