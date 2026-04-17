import prescriptionService from '../services/prescriptionService.js';
import prescriptionPdfService from '../services/prescriptionPdfService.js';
import accessControlService from '../services/accessControlService.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// =========================================================================
// CREAR (solo profesionales - professionalId de sesion, no del body)
// =========================================================================

export const create = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.create({
		...req.body,
		professionalId: req.user.professional.id,
	});

	res.status(201).json({ success: true, data: prescription });
});

// =========================================================================
// LEER POR ID
// =========================================================================

export const getById = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.getById(req.params.id);
	accessControlService.assertPrescriptionReadAccess(req.user, prescription);

	res.status(200).json({ success: true, data: prescription });
});

// =========================================================================
// LEER POR PACIENTE
// =========================================================================

export const getByPatient = catchAsync(async (req, res) => {
	const { patientId } = req.params;
	let filters = req.query;

	if (req.user.role === 'patient') {
		accessControlService.assertPatientSelf(
			req.user,
			patientId,
			'Solo podes ver tus propias recetas.'
		);
	} else {
		await accessControlService.assertProfessionalCanAccessPatient(
			req.user,
			patientId,
			'No tenes vinculo con este paciente.'
		);

		filters = {
			...req.query,
			professionalId: req.user.professional.id,
		};
	}

	const prescriptions = await prescriptionService.getByPatient(patientId, filters);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

// =========================================================================
// LEER POR PROFESIONAL
// =========================================================================

export const getByProfessional = catchAsync(async (req, res) => {
	const { professionalId } = req.params;

	if (req.user.professional?.id !== professionalId) {
		throw new ApiError(403, 'Solo podes ver tus propias recetas.');
	}

	const prescriptions = await prescriptionService.getByProfessional(professionalId, req.query);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

// =========================================================================
// ACTUALIZAR
// =========================================================================

export const update = catchAsync(async (req, res) => {
	const existing = await prescriptionService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional que emitio esta receta puede modificarla.');
	}

	const prescription = await prescriptionService.update(req.params.id, req.body);

	res.status(200).json({ success: true, data: prescription });
});

// =========================================================================
// ELIMINAR
// =========================================================================

export const deletePrescription = catchAsync(async (req, res) => {
	const existing = await prescriptionService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional que emitio esta receta puede eliminarla.');
	}

	await prescriptionService.delete(req.params.id);

	res.status(200).json({ success: true, message: 'Receta eliminada exitosamente.' });
});

// =========================================================================
// DESCARGAR PDF
// =========================================================================

export const download = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.getById(req.params.id);
	accessControlService.assertPrescriptionReadAccess(
		req.user,
		prescription,
		'No tenes permiso para descargar esta receta.'
	);

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
