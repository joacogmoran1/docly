import medicalRecordService from '../services/medicalRecordService.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const create = catchAsync(async (req, res) => {
	const record = await medicalRecordService.create({
		...req.body,
		professionalId: req.user.professional.id,
	});

	res.status(201).json({ success: true, data: record });
});

export const getById = catchAsync(async (req, res) => {
	const record = await medicalRecordService.getById(req.params.id);
	res.status(200).json({ success: true, data: record });
});

export const getByPatient = catchAsync(async (req, res) => {
	const records = await medicalRecordService.getByPatient(req.params.patientId, req.query);
	res.status(200).json({ success: true, results: records.length, data: records });
});

export const getByProfessional = catchAsync(async (req, res) => {
	const records = await medicalRecordService.getByProfessional(req.params.professionalId, req.query);
	res.status(200).json({ success: true, results: records.length, data: records });
});

export const update = catchAsync(async (req, res) => {
	// Solo el profesional que creó el registro puede editarlo
	const existing = await medicalRecordService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional.id) {
		throw new ApiError(403, 'Solo el profesional que creó este registro puede modificarlo.');
	}

	const record = await medicalRecordService.update(req.params.id, req.body);
	res.status(200).json({ success: true, data: record });
});

export const deleteRecord = catchAsync(async (req, res) => {
	// Solo el profesional que creó el registro puede eliminarlo
	const existing = await medicalRecordService.getById(req.params.id);

	if (existing.professionalId !== req.user.professional.id) {
		throw new ApiError(403, 'Solo el profesional que creó este registro puede eliminarlo.');
	}

	await medicalRecordService.delete(req.params.id);
	res.status(200).json({ success: true, message: 'Registro médico eliminado exitosamente.' });
});