// src/routes/professionalRoutes.js
import express from 'express';
import * as professionalController from '../controllers/professionalController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Búsqueda pública (requiere auth pero cualquier rol)
router.get('/search', protect, professionalController.search);
router.get('/:id', protect, professionalController.getById);

// Actualización solo para profesionales
router.put('/:id', protect, restrictTo('professional'), professionalController.updateProfile);

// Gestión de equipo médico del paciente
router.post(
  '/patients/:patientId/professionals/:professionalId',
  protect,
  restrictTo('patient'),
  professionalController.addToPatientTeam
);

router.delete(
  '/patients/:patientId/professionals/:professionalId',
  protect,
  restrictTo('patient'),
  professionalController.removeFromPatientTeam
);

router.get(
  '/patients/:patientId/professionals',
  protect,
  professionalController.getPatientProfessionals
);

export default router;
