import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// ── Lecturas ─────────────────────────────────────────────────────────────
router.get('/:id', appointmentController.getById);
router.get('/patient/:patientId', appointmentController.getByPatient);
router.get('/professional/:professionalId', appointmentController.getByProfessional);

// ── Crear turno (ambos roles) ─────────────────────────────────────────────
router.post('/', appointmentController.create);
router.post('/:id/reschedule', restrictTo('professional'), appointmentController.reschedule);
router.post('/:id/complete', restrictTo('professional'), appointmentController.complete);

// ── Acciones del paciente ────────────────────────────────────────────────
router.post('/:id/confirm', restrictTo('patient'), appointmentController.confirm);

// ── Cancelar (ambos roles) ───────────────────────────────────────────────
router.post('/:id/cancel', appointmentController.cancel);

export default router;