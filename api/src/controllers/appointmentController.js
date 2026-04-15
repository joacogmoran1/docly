import appointmentService from '../services/appointmentService.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';

// =========================================================================
// CREAR TURNO
// - Profesional agenda para un paciente → 'pending' (paciente debe confirmar)
// - Paciente agenda con un profesional → 'confirmed' (ya eligió, no necesita confirmar)
// =========================================================================

export const create = catchAsync(async (req, res) => {
	const role = req.user.role;

	let appointmentData;

	if (role === 'professional') {
		// El profesional agenda: debe enviar patientId en el body
		if (!req.body.patientId) {
			throw new ApiError(400, 'patientId es requerido cuando el profesional agenda un turno.');
		}
		appointmentData = {
			...req.body,
			professionalId: req.user.professional.id,
			createdBy: 'professional',
		};
	} else {
		// El paciente agenda: debe enviar professionalId en el body
		if (!req.body.professionalId) {
			throw new ApiError(400, 'professionalId es requerido cuando el paciente agenda un turno.');
		}
		appointmentData = {
			...req.body,
			patientId: req.user.patient.id,
			createdBy: 'patient',
		};
	}

	const appointment = await appointmentService.create(appointmentData);

	res.status(201).json({ success: true, data: appointment });
});

// =========================================================================
// CONFIRMAR (paciente acepta → 'pending' → 'confirmed')
// =========================================================================

export const confirm = catchAsync(async (req, res) => {
	// Verificar que el paciente es el dueño del turno
	const appointment = await appointmentService.getById(req.params.id);

	if (appointment.patientId !== req.user.patient?.id) {
		throw new ApiError(403, 'Solo el paciente asignado puede confirmar este turno.');
	}

	const updated = await appointmentService.confirm(req.params.id);

	res.status(200).json({ success: true, data: updated });
});

// =========================================================================
// CANCELAR (cualquiera de las partes → 'cancelled')
// =========================================================================

export const cancel = catchAsync(async (req, res) => {
	const appointment = await appointmentService.getById(req.params.id);

	// Solo el profesional o el paciente del turno pueden cancelar
	const isProfessional = appointment.professionalId === req.user.professional?.id;
	const isPatient = appointment.patientId === req.user.patient?.id;

	if (!isProfessional && !isPatient) {
		throw new ApiError(403, 'No tenés permiso para cancelar este turno.');
	}

	const updated = await appointmentService.cancel(req.params.id, req.body.reason);

	res.status(200).json({ success: true, data: updated });
});

// =========================================================================
// COMPLETAR (profesional cierra → 'confirmed' → 'completed')
// =========================================================================

export const complete = catchAsync(async (req, res) => {
	const appointment = await appointmentService.getById(req.params.id);

	if (appointment.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional asignado puede completar este turno.');
	}

	const updated = await appointmentService.complete(req.params.id);

	res.status(200).json({ success: true, data: updated });
});

// =========================================================================
// REPROGRAMAR (profesional cambia fecha/hora → vuelve a 'pending')
// =========================================================================

export const reschedule = catchAsync(async (req, res) => {
	const appointment = await appointmentService.getById(req.params.id);

	if (appointment.professionalId !== req.user.professional?.id) {
		throw new ApiError(403, 'Solo el profesional asignado puede reprogramar este turno.');
	}

	const updated = await appointmentService.reschedule(req.params.id, req.body);

	res.status(200).json({ success: true, data: updated });
});

// =========================================================================
// LECTURAS
// =========================================================================

export const getById = catchAsync(async (req, res) => {
	const appointment = await appointmentService.getById(req.params.id);

	res.status(200).json({ success: true, data: appointment });
});

export const getByPatient = catchAsync(async (req, res) => {
	const appointments = await appointmentService.getByPatient(req.params.patientId);

	res.status(200).json({
		success: true,
		results: appointments.length,
		data: appointments,
	});
});

export const getByProfessional = catchAsync(async (req, res) => {
	const appointments = await appointmentService.getByProfessional(
		req.params.professionalId,
		req.query
	);

	res.status(200).json({
		success: true,
		results: appointments.length,
		data: appointments,
	});
});