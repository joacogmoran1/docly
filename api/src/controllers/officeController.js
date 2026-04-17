import catchAsync from '../utils/catchAsync.js';
import { officeService } from '../services/officeService.js';
import officeBlockService from '../services/officeBlockService.js';
import accessControlService from '../services/accessControlService.js';

// =========================================================================
// CRUD CONSULTORIOS
// =========================================================================

export const create = catchAsync(async (req, res) => {
	const { schedule, ...officeData } = req.body;

	const office = await officeService.create({
		...officeData,
		professionalId: req.user.professional.id,
		schedule,
	});

	res.status(201).json({ success: true, data: office });
});

export const getById = catchAsync(async (req, res) => {
	const office = await officeService.getById(req.params.id);
	res.status(200).json({ success: true, data: office });
});

export const getByProfessional = catchAsync(async (req, res) => {
	const offices = await officeService.getByProfessional(req.params.professionalId);
	res.status(200).json({ success: true, results: offices.length, data: offices });
});

export const update = catchAsync(async (req, res) => {
	const { schedule, ...officeData } = req.body;
	await accessControlService.getOwnedOffice(req.user, req.params.id);
	const office = await officeService.update(req.params.id, { ...officeData, schedule });
	res.status(200).json({ success: true, data: office });
});

export const deleteOffice = catchAsync(async (req, res) => {
	await accessControlService.getOwnedOffice(req.user, req.params.id);
	await officeService.delete(req.params.id);
	res.status(200).json({ success: true, message: 'Consultorio eliminado exitosamente.' });
});

// =========================================================================
// BLOQUEOS
// =========================================================================

export const blockDay = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	await accessControlService.getOwnedOffice(req.user, officeId);
	const result = await officeBlockService.blockDay(officeId, req.body);

	res.status(201).json({
		success: true,
		data: result.block,
		cancelledAppointments: result.cancelledAppointments,
	});
});

export const blockTimeSlots = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	await accessControlService.getOwnedOffice(req.user, officeId);
	const result = await officeBlockService.blockTimeSlots(officeId, req.body);

	res.status(201).json({
		success: true,
		data: result.blocks,
		cancelledAppointments: result.cancelledAppointments,
	});
});

export const getBlocks = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	await accessControlService.getOwnedOffice(
		req.user,
		officeId,
		'Solo podes ver los bloqueos de tus propios consultorios.'
	);
	const blocks = await officeBlockService.getByOffice(officeId, req.query);

	res.status(200).json({
		success: true,
		results: blocks.length,
		data: blocks,
	});
});

export const deleteBlock = catchAsync(async (req, res) => {
	const { officeId, blockId } = req.params;
	await accessControlService.getOwnedOffice(req.user, officeId);
	await officeBlockService.deleteBlock(officeId, blockId);

	res.status(200).json({
		success: true,
		message: 'Bloqueo eliminado exitosamente.',
	});
});

// =========================================================================
// CANCELACION EN LOTE
// =========================================================================

export const cancelDay = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	await accessControlService.getOwnedOffice(req.user, officeId);
	const result = await officeBlockService.cancelDayAppointments(officeId, req.body);

	res.status(200).json({
		success: true,
		cancelledAppointments: result.cancelledAppointments,
		message: `${result.cancelledAppointments} turno(s) cancelado(s).`,
	});
});
