// src/controllers/patientController.js
import patientService from '../services/patientService.js';
import catchAsync from '../utils/catchAsync.js';

export const getProfile = catchAsync(async (req, res) => {
  const patient = await patientService.getProfile(req.params.id);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const patient = await patientService.updateProfile(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

export const getHealthInfo = catchAsync(async (req, res) => {
  const healthInfo = await patientService.getHealthInfo(req.params.id);

  res.status(200).json({
    success: true,
    data: healthInfo,
  });
});

export const updateHealthInfo = catchAsync(async (req, res) => {
  const healthInfo = await patientService.updateHealthInfo(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: healthInfo,
  });
});
