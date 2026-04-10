// src/routes/patientRoutes.js
import express from 'express';
import * as patientController from '../controllers/patientController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

router.get('/:id', patientController.getProfile);
router.put('/:id', restrictTo('patient'), patientController.updateProfile);
router.get('/:id/health', patientController.getHealthInfo);
router.put('/:id/health', restrictTo('patient'), patientController.updateHealthInfo);

export default router;
