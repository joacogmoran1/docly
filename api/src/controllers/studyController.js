import studyService from '../services/studyService.js';
import catchAsync from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
	const study = await studyService.create(req.body);

	res.status(201).json({
		success: true,
		data: study,
	});
});

export const getById = catchAsync(async (req, res) => {
	const study = await studyService.getById(req.params.id);

	res.status(200).json({
		success: true,
		data: study,
	});
});

export const getByPatient = catchAsync(async (req, res) => {
	const studies = await studyService.getByPatient(req.params.patientId, req.query);

	res.status(200).json({
		success: true,
		results: studies.length,
		data: studies,
	});
});

export const getByProfessional = catchAsync(async (req, res) => {
	const studies = await studyService.getByProfessional(req.params.professionalId, req.query);

	res.status(200).json({
		success: true,
		results: studies.length,
		data: studies,
	});
});

export const update = catchAsync(async (req, res) => {
	const study = await studyService.update(req.params.id, req.body);

	res.status(200).json({
		success: true,
		data: study,
	});
});

export const deleteStudy = catchAsync(async (req, res) => {
	await studyService.delete(req.params.id);

	res.status(200).json({
		success: true,
		message: 'Estudio eliminado exitosamente.',
	});
});
