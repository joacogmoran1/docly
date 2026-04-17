import medicalRecordService from '../services/medicalRecordService.js';
import accessControlService from '../services/accessControlService.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

export const create = catchAsync(async (req, res) => {
	await accessControlService.assertProfessionalCanAccessPatient(
		req.user,
		req.body.patientId,
		'No tenés vínculo con este paciente para crear un registro médico.'
	);

	const record = await medicalRecordService.create({
		...req.body,
		professionalId: req.user.professional.id,
	});

	res.status(201).json({ success: true, data: record });
});

export const getById = catchAsync(async (req, res) => {
	const record = await medicalRecordService.getById(req.params.id);
	accessControlService.assertMedicalRecordReadAccess(req.user, record);
	res.status(200).json({ success: true, data: record });
});

export const getByPatient = catchAsync(async (req, res) => {
	let filters = req.query;

	if (req.user.role === 'patient') {
		accessControlService.assertPatientSelf(
			req.user,
			req.params.patientId,
			'Solo podés ver tus propios registros médicos.'
		);
	} else {
		await accessControlService.assertProfessionalCanAccessPatient(
			req.user,
			req.params.patientId,
			'No tenés vínculo con este paciente.'
		);

		filters = {
			...req.query,
			professionalId: req.user.professional.id,
		};
	}

	const records = await medicalRecordService.getByPatient(req.params.patientId, filters);
	res.status(200).json({ success: true, results: records.length, data: records });
});

export const getByProfessional = catchAsync(async (req, res) => {
	accessControlService.assertProfessionalSelf(
		req.user,
		req.params.professionalId,
		'Solo podés ver tus propios registros médicos.'
	);

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
