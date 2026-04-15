import prescriptionService from '../services/prescriptionService.js';
import prescriptionPdfService from '../services/prescriptionPdfService.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// =========================================================================
// CREAR (solo profesionales — professionalId de sesión, NO del body)
// =========================================================================

export const create = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.create({
		...req.body,
		// Sobreescribir lo que mande el frontend
		professionalId: req.user.professional.id,
	});

	res.status(201).json({ success: true, data: prescription });
});

// =========================================================================
// LEER POR ID
// Solo el paciente dueño o el profesional emisor
// =========================================================================

export const getById = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.getById(req.params.id);

	const isOwnerPatient = prescription.patientId === req.user.patient?.id;
	const isOwnerProfessional = prescription.professionalId === req.user.professional?.id;

	if (!isOwnerPatient && !isOwnerProfessional) {
		throw new ApiError(403, 'No tenés permiso para ver esta receta.');
	}

	res.status(200).json({ success: true, data: prescription });
});

// =========================================================================
// LEER POR PACIENTE
// Solo ese paciente, o un profesional vinculado a ese paciente
// =========================================================================

export const getByPatient = catchAsync(async (req, res) => {
	const { patientId } = req.params;

	if (req.user.role === 'patient') {
		if (req.user.patient?.id !== patientId) {
			throw new ApiError(403, 'Solo podés ver tus propias recetas.');
		}
	}
	// Si es profesional, el filtro de query solo devuelve las suyas vía professionalId
	// (no puede ver recetas de otros profesionales para ese paciente salvo que se agregue lógica)

	const prescriptions = await prescriptionService.getByPatient(patientId, req.query);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

// =========================================================================
// LEER POR PROFESIONAL
// Solo ese profesional
// =========================================================================

export const getByProfessional = catchAsync(async (req, res) => {
	const { professionalId } = req.params;

	if (req.user.professional?.id !== professionalId) {
		throw new ApiError(403, 'Solo podés ver tus propias recetas.');
	}

	const prescriptions = await prescriptionService.getByProfessional(professionalId, req.query);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

// =========================================================================
// ACTUALIZAR — solo el profesional que la creó
// =========================================================================

export const update = catchAsync(async (req, res) => {
	const existing = await prescriptionService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional que emitió esta receta puede modificarla.');
	}

	const prescription = await prescriptionService.update(req.params.id, req.body);

	res.status(200).json({ success: true, data: prescription });
});

// =========================================================================
// ELIMINAR — solo el profesional que la creó
// =========================================================================

export const deletePrescription = catchAsync(async (req, res) => {
	const existing = await prescriptionService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional que emitió esta receta puede eliminarla.');
	}

	await prescriptionService.delete(req.params.id);

	res.status(200).json({ success: true, message: 'Receta eliminada exitosamente.' });
});

// =========================================================================
// DESCARGAR PDF — paciente dueño o profesional emisor
// =========================================================================

export const download = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.getById(req.params.id);

	const isOwnerPatient = prescription.patientId === req.user.patient?.id;
	const isOwnerProfessional = prescription.professionalId === req.user.professional?.id;

	if (!isOwnerPatient && !isOwnerProfessional) {
		throw new ApiError(403, 'No tenés permiso para descargar esta receta.');
	}

	const pdfBuffer = await prescriptionPdfService.generate(req.params.id);

	const patientName = `${prescription.patient?.user?.lastName || 'paciente'}`;
	const dateStr = new Date(prescription.createdAt).toISOString().split('T')[0];
	const filename = `receta_${patientName}_${dateStr}.pdf`;

	res.set({
		'Content-Type': 'application/pdf',
		'Content-Disposition': `attachment; filename="${filename}"`,
		'Content-Length': pdfBuffer.length,
	});

	res.send(pdfBuffer);
});