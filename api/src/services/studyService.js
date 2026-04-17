import { Study, Patient, Professional, User, PatientProfessional } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

const SAFE_RESOURCE_PROTOCOLS = new Set(['http:', 'https:']);
const PDF_DATA_URI_PATTERN = /^data:application\/pdf;base64,[a-z0-9+/=\s]+=*$/i;
const MAX_DATA_URI_LENGTH = 7_000_000;
const MAX_REMOTE_URL_LENGTH = 2048;

function normalizeOptionalText(value) {
	if (value === undefined || value === null) {
		return value ?? null;
	}

	if (typeof value !== 'string') {
		return value;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function isSafeRemoteUrl(value) {
	try {
		const parsed = new URL(value);
		return SAFE_RESOURCE_PROTOCOLS.has(parsed.protocol);
	} catch {
		return false;
	}
}

function isSafePdfDataUri(value) {
	return value.length <= MAX_DATA_URI_LENGTH && PDF_DATA_URI_PATTERN.test(value);
}

function splitResourceList(value) {
	if (!value) {
		return [];
	}

	return value.startsWith('data:')
		? [value]
		: value
			.split(',')
			.map(item => item.trim())
			.filter(Boolean);
}

function validateResourceEntry(entry, fieldName) {
	if (isSafeRemoteUrl(entry)) {
		if (entry.length > MAX_REMOTE_URL_LENGTH) {
			throw new ApiError(400, `El campo "${fieldName}" contiene un enlace demasiado largo.`);
		}

		return entry;
	}

	if (isSafePdfDataUri(entry)) {
		return entry;
	}

	throw new ApiError(
		400,
		`El campo "${fieldName}" solo admite enlaces http/https o PDFs en data URI base64.`
	);
}

function sanitizeResourceField(value, fieldName, options = {}) {
	const { allowMultiple = false } = options;
	const normalized = normalizeOptionalText(value);

	if (normalized === null || normalized === undefined) {
		return normalized ?? null;
	}

	if (typeof normalized !== 'string') {
		throw new ApiError(400, `El campo "${fieldName}" debe ser un texto valido.`);
	}

	const resources = splitResourceList(normalized).map(entry => validateResourceEntry(entry, fieldName));

	if (!resources.length) {
		return null;
	}

	if (!allowMultiple && resources.length > 1) {
		throw new ApiError(400, `El campo "${fieldName}" solo admite un archivo o enlace.`);
	}

	return allowMultiple ? resources.join(', ') : resources[0];
}

class StudyService {
	async create(studyData) {
		const { patientId, professionalId, type, date, results, fileUrl, notes } = studyData;

		const patient = await Patient.findByPk(patientId);
		if (!patient) {
			throw new ApiError(404, 'Paciente no encontrado.');
		}

		if (professionalId) {
			const professional = await Professional.findByPk(professionalId);
			if (!professional) {
				throw new ApiError(404, 'Profesional no encontrado.');
			}
		}

		const study = await Study.create({
			patientId,
			professionalId,
			type,
			date,
			results: sanitizeResourceField(results, 'results'),
			fileUrl: sanitizeResourceField(fileUrl, 'fileUrl', { allowMultiple: true }),
			notes: normalizeOptionalText(notes),
		});

		if (professionalId) {
			await PatientProfessional.findOrCreate({
				where: { patientId, professionalId },
			});
		}

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

		if (filters.viewerProfessionalId) {
			whereClause[Op.or] = [
				{ professionalId: filters.viewerProfessionalId },
				{ professionalId: null },
			];
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

		const nextValues = {};

		if (type !== undefined) {
			nextValues.type = type;
		}

		if (date !== undefined) {
			nextValues.date = date;
		}

		if (results !== undefined) {
			nextValues.results = sanitizeResourceField(results, 'results');
		}

		if (fileUrl !== undefined) {
			nextValues.fileUrl = sanitizeResourceField(fileUrl, 'fileUrl', { allowMultiple: true });
		}

		if (notes !== undefined) {
			nextValues.notes = normalizeOptionalText(notes);
		}

		await study.update(nextValues);

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
