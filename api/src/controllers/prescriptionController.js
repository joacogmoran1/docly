import prescriptionService from '../services/prescriptionService.js';
import catchAsync from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.create(req.body);

	res.status(201).json({
		success: true,
		data: prescription,
	});
});

export const getById = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.getById(req.params.id);

	res.status(200).json({
		success: true,
		data: prescription,
	});
});

export const getByPatient = catchAsync(async (req, res) => {
	const prescriptions = await prescriptionService.getByPatient(req.params.patientId, req.query);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

export const getByProfessional = catchAsync(async (req, res) => {
	const prescriptions = await prescriptionService.getByProfessional(req.params.professionalId, req.query);

	res.status(200).json({
		success: true,
		results: prescriptions.length,
		data: prescriptions,
	});
});

export const update = catchAsync(async (req, res) => {
	const prescription = await prescriptionService.update(req.params.id, req.body);

	res.status(200).json({
		success: true,
		data: prescription,
	});
});

export const deletePrescription = catchAsync(async (req, res) => {
	await prescriptionService.delete(req.params.id);

	res.status(200).json({
		success: true,
		message: 'Receta eliminada exitosamente.',
	});
});
