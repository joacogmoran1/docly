import professionalService from '../services/professionalService.js';
import { Professional } from '../database/models/index.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// Tipos MIME permitidos para la firma
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Tamaño máximo del base64: ~500KB de imagen ≈ ~680KB en base64
const MAX_SIGNATURE_LENGTH = 700_000;

export const search = catchAsync(async (req, res) => {
	const { q, specialty, coverage } = req.query;
	const professionals = await professionalService.search(q, { specialty, coverage });
	res.status(200).json({ success: true, results: professionals.length, data: professionals });
});

export const getById = catchAsync(async (req, res) => {
	const professional = await professionalService.getById(req.params.id);
	res.status(200).json({ success: true, data: professional });
});

export const updateProfile = catchAsync(async (req, res) => {
	const professional = await professionalService.updateProfile(req.params.id, req.body);
	res.status(200).json({ success: true, data: professional });
});

export const addToPatientTeam = catchAsync(async (req, res) => {
	const { patientId, professionalId } = req.params;
	await professionalService.addToPatientTeam(patientId, professionalId);
	res.status(201).json({ success: true, message: 'Profesional agregado al equipo exitosamente.' });
});

export const removeFromPatientTeam = catchAsync(async (req, res) => {
	const { patientId, professionalId } = req.params;
	await professionalService.removeFromPatientTeam(patientId, professionalId);
	res.status(200).json({ success: true, message: 'Profesional removido del equipo.' });
});

export const getPatientProfessionals = catchAsync(async (req, res) => {
	const professionals = await professionalService.getPatientProfessionals(req.params.patientId);
	res.status(200).json({ success: true, results: professionals.length, data: professionals });
});

export const getProfessionalPatients = catchAsync(async (req, res) => {
	const patients = await professionalService.getProfessionalPatients(req.params.professionalId);
	res.status(200).json({ success: true, results: patients.length, data: patients });
});

export const getProfessionalPatient = catchAsync(async (req, res) => {
	const { professionalId, patientId } = req.params;
	const patient = await professionalService.getProfessionalPatient(professionalId, patientId);
	res.status(200).json({ success: true, data: patient });
});

export const getProfessionalAvailability = catchAsync(async (req, res) => {
	const { professionalId } = req.params;
	const { startDate, endDate } = req.query;
	const availability = await professionalService.getProfessionalAvailability(professionalId, startDate, endDate);
	res.status(200).json({ success: true, data: availability });
});

// =========================================================================
// FIRMA DEL PROFESIONAL
// =========================================================================

/**
 * PUT /professionals/:id/signature
 * Body: { signature: "data:image/png;base64,iVBOR..." }
 *
 * Sube o reemplaza la firma del profesional.
 */
export const uploadSignature = catchAsync(async (req, res) => {
	const { id } = req.params;

	// Solo el profesional dueño puede subir su firma
	if (req.user.professional?.id !== id) {
		throw new ApiError(403, 'Solo podés cargar tu propia firma.');
	}

	const { signature } = req.body;

	if (!signature || typeof signature !== 'string') {
		throw new ApiError(400, 'Se requiere el campo "signature" con la imagen en formato base64 data URI.');
	}

	// Validar formato data URI
	const dataUriMatch = signature.match(/^data:(image\/(png|jpeg|webp));base64,/);
	if (!dataUriMatch) {
		throw new ApiError(400, `Formato inválido. Se acepta data URI con tipo: ${ALLOWED_MIME_TYPES.join(', ')}`);
	}

	// Validar tamaño
	if (signature.length > MAX_SIGNATURE_LENGTH) {
		throw new ApiError(400, 'La imagen de la firma es demasiado grande. Máximo ~500KB.');
	}

	const professional = await Professional.findByPk(id);
	if (!professional) {
		throw new ApiError(404, 'Profesional no encontrado.');
	}

	await professional.update({ signature });

	res.status(200).json({
		success: true,
		message: 'Firma cargada exitosamente.',
		data: { hasSignature: true },
	});
});

/**
 * DELETE /professionals/:id/signature
 * Elimina la firma del profesional.
 */
export const deleteSignature = catchAsync(async (req, res) => {
	const { id } = req.params;

	if (req.user.professional?.id !== id) {
		throw new ApiError(403, 'Solo podés eliminar tu propia firma.');
	}

	const professional = await Professional.findByPk(id);
	if (!professional) {
		throw new ApiError(404, 'Profesional no encontrado.');
	}

	await professional.update({ signature: null });

	res.status(200).json({
		success: true,
		message: 'Firma eliminada exitosamente.',
		data: { hasSignature: false },
	});
});

/**
 * GET /professionals/:id/signature
 * Devuelve la firma del profesional (solo el profesional dueño).
 */
export const getSignature = catchAsync(async (req, res) => {
	const { id } = req.params;

	// Solo el profesional dueño puede ver su firma completa
	if (req.user.professional?.id !== id) {
		throw new ApiError(403, 'Solo podés ver tu propia firma.');
	}

	const professional = await Professional.findByPk(id, {
		attributes: ['id', 'signature'],
	});

	if (!professional) {
		throw new ApiError(404, 'Profesional no encontrado.');
	}

	res.status(200).json({
		success: true,
		data: {
			hasSignature: !!professional.signature,
			signature: professional.signature,
		},
	});
});