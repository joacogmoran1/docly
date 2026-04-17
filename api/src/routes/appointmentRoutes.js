import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { agendaReadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect);

// ── Lecturas ─────────────────────────────────────────────────────────────
router.get('/:id', agendaReadLimiter, appointmentController.getById);
router.get('/patient/:patientId', agendaReadLimiter, appointmentController.getByPatient);
router.get('/professional/:professionalId', agendaReadLimiter, appointmentController.getByProfessional);

// ── Crear turno (ambos roles) ─────────────────────────────────────────────
router.post('/', appointmentController.create);
router.post('/:id/complete', restrictTo('professional'), appointmentController.complete);

// ── Acciones del paciente ────────────────────────────────────────────────
router.post('/:id/confirm', restrictTo('patient'), appointmentController.confirm);

// ── Cancelar (ambos roles) ───────────────────────────────────────────────
router.post('/:id/cancel', appointmentController.cancel);

export default router;
