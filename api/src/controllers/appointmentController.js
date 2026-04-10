// src/controllers/appointmentController.js
import appointmentService from '../services/appointmentService.js';
import catchAsync from '../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const appointment = await appointmentService.create(req.body);

  res.status(201).json({
    success: true,
    data: appointment,
  });
});

export const getById = catchAsync(async (req, res) => {
  const appointment = await appointmentService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: appointment,
  });
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

export const update = catchAsync(async (req, res) => {
  const appointment = await appointmentService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

export const cancel = catchAsync(async (req, res) => {
  const appointment = await appointmentService.cancel(req.params.id, req.body.reason);

  res.status(200).json({
    success: true,
    data: appointment,
  });
});
