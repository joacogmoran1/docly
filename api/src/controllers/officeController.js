import catchAsync from '../utils/catchAsync.js';
import { officeService } from '../services/officeService.js';
import officeBlockService from '../services/officeBlockService.js';

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
	const office = await officeService.update(req.params.id, { ...officeData, schedule });
	res.status(200).json({ success: true, data: office });
});

export const deleteOffice = catchAsync(async (req, res) => {
	await officeService.delete(req.params.id);
	res.status(200).json({ success: true, message: 'Consultorio eliminado exitosamente.' });
});

// =========================================================================
// BLOQUEOS
// =========================================================================

/**
 * POST /offices/:officeId/blocks/day
 * Body: { date, reason?, cancelExisting? }
 */
export const blockDay = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	const result = await officeBlockService.blockDay(officeId, req.body);

	res.status(201).json({
		success: true,
		data: result.block,
		cancelledAppointments: result.cancelledAppointments,
	});
});

/**
 * POST /offices/:officeId/blocks/time-slots
 * Body: { date, slots: [{ startTime, endTime }], reason?, cancelExisting? }
 */
export const blockTimeSlots = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	const result = await officeBlockService.blockTimeSlots(officeId, req.body);

	res.status(201).json({
		success: true,
		data: result.blocks,
		cancelledAppointments: result.cancelledAppointments,
	});
});

/**
 * GET /offices/:officeId/blocks?startDate=&endDate=&date=
 */
export const getBlocks = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	const blocks = await officeBlockService.getByOffice(officeId, req.query);

	res.status(200).json({
		success: true,
		results: blocks.length,
		data: blocks,
	});
});

/**
 * DELETE /offices/:officeId/blocks/:blockId
 */
export const deleteBlock = catchAsync(async (req, res) => {
	const { officeId, blockId } = req.params;
	await officeBlockService.deleteBlock(officeId, blockId);

	res.status(200).json({
		success: true,
		message: 'Bloqueo eliminado exitosamente.',
	});
});

// =========================================================================
// CANCELACIÓN EN LOTE
// =========================================================================

/**
 * POST /offices/:officeId/cancel-day
 * Body: { date, reason? }
 * Cancela todos los turnos del día SIN bloquear.
 * (Para cancelar + bloquear, usar POST /blocks/day con cancelExisting=true)
 */
export const cancelDay = catchAsync(async (req, res) => {
	const { officeId } = req.params;
	const result = await officeBlockService.cancelDayAppointments(officeId, req.body);

	res.status(200).json({
		success: true,
		cancelledAppointments: result.cancelledAppointments,
		message: `${result.cancelledAppointments} turno(s) cancelado(s).`,
	});
});