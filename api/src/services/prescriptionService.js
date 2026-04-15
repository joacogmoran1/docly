import { Prescription, Patient, Professional, PatientProfessional, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

// Whitelist estricta de campos
const ALLOWED_CREATE_FIELDS = [
	'patientId', 'professionalId', 'medications',
	'diagnosis', 'instructions', 'validUntil',
];

const ALLOWED_UPDATE_FIELDS = [
	'medications', 'diagnosis', 'instructions', 'validUntil',
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

// Includes reutilizables para las queries
const INCLUDE_PATIENT = {
	association: 'patient',
	include: [{ association: 'user', attributes: ['name', 'lastName', 'email'] }],
};

const INCLUDE_PROFESSIONAL = {
	association: 'professional',
	attributes: { exclude: ['signature'] },
	include: [{ association: 'user', attributes: ['name', 'lastName'] }],
};

class PrescriptionService {
	// =========================================================================
	// CREAR
	// =========================================================================

	async create(prescriptionData) {
		const data = pickFields(prescriptionData, ALLOWED_CREATE_FIELDS);

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

		// Verificar que el profesional tenga firma cargada
		if (!professional.signature) {
			throw new ApiError(400, 'Debés cargar tu firma antes de emitir recetas. Podés hacerlo desde tu perfil.');
		}

		// Verificar vínculo profesional-paciente
		const hasLink = await this._hasPatientLink(data.professionalId, data.patientId);
		if (!hasLink) {
			throw new ApiError(403, 'No tenés vínculo con este paciente. No se puede emitir la receta.');
		}

		const prescription = await Prescription.create(data);

		return await this.getById(prescription.id);
	}

	// =========================================================================
	// LEER POR ID
	// =========================================================================

	async getById(prescriptionId) {
		const prescription = await Prescription.findByPk(prescriptionId, {
			include: [INCLUDE_PATIENT, INCLUDE_PROFESSIONAL],
		});

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		return prescription;
	}

	// =========================================================================
	// LEER POR PACIENTE
	// =========================================================================

	async getByPatient(patientId, filters = {}) {
		const whereClause = { patientId };

		if (filters.professionalId) {
			whereClause.professionalId = filters.professionalId;
		}

		if (filters.valid === 'true') {
			whereClause.validUntil = { [Op.gte]: new Date() };
		}

		if (filters.search) {
			whereClause[Op.or] = this._buildSearchConditions(filters.search);
		}

		return await Prescription.findAll({
			where: whereClause,
			include: [INCLUDE_PROFESSIONAL],
			order: [['createdAt', 'DESC']],
		});
	}

	// =========================================================================
	// LEER POR PROFESIONAL
	// =========================================================================

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		if (filters.patientId) {
			whereClause.patientId = filters.patientId;
		}

		if (filters.search) {
			whereClause[Op.or] = this._buildSearchConditions(filters.search);
		}

		return await Prescription.findAll({
			where: whereClause,
			include: [INCLUDE_PATIENT],
			order: [['createdAt', 'DESC']],
		});
	}

	// =========================================================================
	// ACTUALIZAR
	// =========================================================================

	async update(prescriptionId, updateData) {
		const prescription = await Prescription.findByPk(prescriptionId);

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		const data = pickFields(updateData, ALLOWED_UPDATE_FIELDS);

		await prescription.update(data);

		return await this.getById(prescriptionId);
	}

	// =========================================================================
	// ELIMINAR
	// =========================================================================

	async delete(prescriptionId) {
		const prescription = await Prescription.findByPk(prescriptionId);

		if (!prescription) {
			throw new ApiError(404, 'Receta no encontrada.');
		}

		await prescription.destroy();

		return { success: true };
	}

	// =========================================================================
	// HELPERS PRIVADOS
	// =========================================================================

	/**
	 * Verifica si el profesional tiene vínculo con el paciente.
	 * Busca en la tabla PatientProfessional O en turnos/registros previos.
	 */
	async _hasPatientLink(professionalId, patientId) {
		// Primero buscar relación directa
		const directLink = await PatientProfessional.findOne({
			where: { professionalId, patientId },
		});
		if (directLink) return true;

		// Fallback: buscar si hay turnos, recetas o registros previos
		const [result] = await sequelize.query(
			`
			SELECT 1 FROM (
				SELECT patient_id FROM appointments WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
				SELECT patient_id FROM prescriptions WHERE professional_id = :professionalId AND patient_id = :patientId
				UNION
				SELECT patient_id FROM medical_records WHERE professional_id = :professionalId AND patient_id = :patientId
			) AS links
			LIMIT 1
			`,
			{
				replacements: { professionalId, patientId },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		return !!result;
	}

	/**
	 * Construye condiciones de búsqueda que incluyen medications[].name
	 * además de diagnosis e instructions.
	 */
	_buildSearchConditions(search) {
		const term = `%${search}%`;
		return [
			{ diagnosis: { [Op.iLike]: term } },
			{ instructions: { [Op.iLike]: term } },
			// Buscar dentro del JSONB medications por nombre de medicamento
			sequelize.where(
				sequelize.cast(sequelize.col('medications'), 'text'),
				{ [Op.iLike]: term }
			),
		];
	}
}

export default new PrescriptionService();