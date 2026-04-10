// src/routes/appointmentRoutes.js
import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', appointmentController.create);
router.get('/:id', appointmentController.getById);
router.get('/patient/:patientId', appointmentController.getByPatient);
router.get('/professional/:professionalId', appointmentController.getByProfessional);
router.put('/:id', appointmentController.update);
router.post('/:id/cancel', appointmentController.cancel);

export default router;
