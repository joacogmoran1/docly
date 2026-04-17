// src/controllers/patientController.js
import patientService from '../services/patientService.js';
import accessControlService from '../services/accessControlService.js';
import catchAsync from '../utils/catchAsync.js';

export const search = catchAsync(async (req, res) => {
  const patients = await patientService.search(req.query.q, req.user.professional.id);

  res.status(200).json({
    success: true,
    results: patients.length,
    data: patients,
  });
});

export const getProfile = catchAsync(async (req, res) => {
  await accessControlService.assertPatientOrLinkedProfessional(
    req.user,
    req.params.id,
    'Solo podés ver tu propio perfil.',
    'No tenés vínculo con este paciente.'
  );

  const patient = await patientService.getProfile(req.params.id);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  accessControlService.assertPatientSelf(
    req.user,
    req.params.id,
    'Solo podés modificar tu propio perfil.'
  );

  const patient = await patientService.updateProfile(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: patient,
  });
});

export const getHealthInfo = catchAsync(async (req, res) => {
  await accessControlService.assertPatientOrLinkedProfessional(
    req.user,
    req.params.id,
    'Solo podés ver tu propia información de salud.',
    'No tenés vínculo con este paciente.'
  );

  const healthInfo = await patientService.getHealthInfo(req.params.id);

  res.status(200).json({
    success: true,
    data: healthInfo,
  });
});

export const updateHealthInfo = catchAsync(async (req, res) => {
  accessControlService.assertPatientSelf(
    req.user,
    req.params.id,
    'Solo podés modificar tu propia información de salud.'
  );

  const healthInfo = await patientService.updateHealthInfo(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: healthInfo,
  });
});
