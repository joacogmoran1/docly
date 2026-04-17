import studyService from '../services/studyService.js';
import accessControlService from '../services/accessControlService.js';
import catchAsync from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
	let payload;

	if (req.user.role === 'patient') {
		payload = {
			...req.body,
			patientId: req.user.patient.id,
			professionalId: null,
		};
	} else {
		await accessControlService.assertProfessionalCanAccessPatient(
			req.user,
			req.body.patientId,
			'No tenes vinculo con este paciente para cargar estudios.'
		);

		payload = {
			...req.body,
			professionalId: req.user.professional.id,
		};
	}

	const study = await studyService.create(payload);

	res.status(201).json({
		success: true,
		data: study,
	});
});

export const getById = catchAsync(async (req, res) => {
	const study = await studyService.getById(req.params.id);
	await accessControlService.assertStudyReadAccess(req.user, study);

	res.status(200).json({
		success: true,
		data: study,
	});
});

export const getByPatient = catchAsync(async (req, res) => {
	let filters = req.query;

	if (req.user.role === 'patient') {
		accessControlService.assertPatientSelf(
			req.user,
			req.params.patientId,
			'Solo podes ver tus propios estudios.'
		);
	} else {
		await accessControlService.assertProfessionalCanAccessPatient(
			req.user,
			req.params.patientId,
			'No tenes vinculo con este paciente.'
		);

		filters = {
			...req.query,
			viewerProfessionalId: req.user.professional.id,
		};
	}

	const studies = await studyService.getByPatient(req.params.patientId, filters);

	res.status(200).json({
		success: true,
		results: studies.length,
		data: studies,
	});
});

export const getByProfessional = catchAsync(async (req, res) => {
	accessControlService.assertProfessionalSelf(
		req.user,
		req.params.professionalId,
		'Solo podes ver tus propios estudios.'
	);

	const studies = await studyService.getByProfessional(req.params.professionalId, req.query);

	res.status(200).json({
		success: true,
		results: studies.length,
		data: studies,
	});
});

export const update = catchAsync(async (req, res) => {
	const existingStudy = await studyService.getById(req.params.id);
	accessControlService.assertStudyWriteAccess(req.user, existingStudy);

	const study = await studyService.update(req.params.id, req.body);

	res.status(200).json({
		success: true,
		data: study,
	});
});

export const deleteStudy = catchAsync(async (req, res) => {
	const existingStudy = await studyService.getById(req.params.id);
	accessControlService.assertStudyWriteAccess(
		req.user,
		existingStudy,
		'No tenes permiso para eliminar este estudio.'
	);

	await studyService.delete(req.params.id);

	res.status(200).json({
		success: true,
		message: 'Estudio eliminado exitosamente.',
	});
});
