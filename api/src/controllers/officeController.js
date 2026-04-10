import catchAsync from '../utils/catchAsync.js';
import { officeService } from '../services/officeService.js';

export const create = catchAsync(async (req, res) => {
	const { schedule, ...officeData } = req.body;

	const office = await officeService.create({
		...officeData,
		schedule,
	});

	res.status(201).json({
		success: true,
		data: office,
	});
});

export const getById = catchAsync(async (req, res) => {
	const { id } = req.params;

	const office = await officeService.getById(id);

	if (!office) {
		return res.status(404).json({
			success: false,
			message: 'Consultorio no encontrado',
		});
	}

	res.status(200).json({
		success: true,
		data: office,
	});
});

export const getByProfessional = catchAsync(async (req, res) => {
	const { professionalId } = req.params;

	const offices = await officeService.getByProfessional(professionalId);

	res.status(200).json({
		success: true,
		results: offices.length,
		data: offices,
	});
});

export const update = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { schedule, ...officeData } = req.body;

	const office = await officeService.update(id, {
		...officeData,
		schedule,
	});

	res.status(200).json({
		success: true,
		data: office,
	});
});

export const deleteOffice = catchAsync(async (req, res) => {
	const { id } = req.params;

	await officeService.delete(id);

	res.status(200).json({
		success: true,
		message: 'Consultorio eliminado exitosamente',
	});
});