import professionalService from '../services/professionalService.js';
import catchAsync from '../utils/catchAsync.js';

export const search = catchAsync(async (req, res) => {
	const { q, specialty, coverage } = req.query;

	const professionals = await professionalService.search(q, { specialty, coverage });

	res.status(200).json({
		success: true,
		results: professionals.length,
		data: professionals,
	});
});

export const getById = catchAsync(async (req, res) => {
	const professional = await professionalService.getById(req.params.id);

	res.status(200).json({
		success: true,
		data: professional,
	});
});

export const updateProfile = catchAsync(async (req, res) => {
	const professional = await professionalService.updateProfile(req.params.id, req.body);

	res.status(200).json({
		success: true,
		data: professional,
	});
});

export const addToPatientTeam = catchAsync(async (req, res) => {
	const { patientId, professionalId } = req.params;

	await professionalService.addToPatientTeam(patientId, professionalId);

	res.status(201).json({
		success: true,
		message: 'Profesional agregado al equipo exitosamente.',
	});
});

export const removeFromPatientTeam = catchAsync(async (req, res) => {
	const { patientId, professionalId } = req.params;

	await professionalService.removeFromPatientTeam(patientId, professionalId);

	res.status(200).json({
		success: true,
		message: 'Profesional removido del equipo.',
	});
});

export const getPatientProfessionals = catchAsync(async (req, res) => {
	const professionals = await professionalService.getPatientProfessionals(req.params.patientId);

	res.status(200).json({
		success: true,
		results: professionals.length,
		data: professionals,
	});
});

/**
 * ⭐ NUEVO: Obtener todos los pacientes del profesional
 */
export const getProfessionalPatients = catchAsync(async (req, res) => {
	const patients = await professionalService.getProfessionalPatients(req.params.professionalId);

	res.status(200).json({
		success: true,
		results: patients.length,
		data: patients,
	});
});

/**
 * ⭐ NUEVO: Obtener un paciente específico del profesional con toda su info
 */
export const getProfessionalPatient = catchAsync(async (req, res) => {
	const { professionalId, patientId } = req.params;

	const patient = await professionalService.getProfessionalPatient(professionalId, patientId);

	res.status(200).json({
		success: true,
		data: patient,
	});
});

/**
 * ⭐ NUEVO: Obtener disponibilidad del profesional
 */
export const getProfessionalAvailability = catchAsync(async (req, res) => {
	const { professionalId } = req.params;
	const { startDate, endDate } = req.query;

	const availability = await professionalService.getProfessionalAvailability(
		professionalId,
		startDate,
		endDate
	);

	res.status(200).json({
		success: true,
		data: availability,
	});
});
