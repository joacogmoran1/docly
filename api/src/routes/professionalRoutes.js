import express from 'express';
import * as professionalController from '../controllers/professionalController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { agendaReadLimiter, searchLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ── Búsqueda (cualquier usuario autenticado) ─────────────────────────────
router.get('/search', protect, searchLimiter, professionalController.search);
router.get('/:id', protect, professionalController.getById);

// ── Perfil (solo el profesional dueño) ──────────────────────────────────
router.put('/:id', protect, restrictTo('professional'), professionalController.updateProfile);

// ── Firma del profesional ───────────────────────────────────────────────
router.get('/:id/signature', protect, restrictTo('professional'), professionalController.getSignature);
router.put('/:id/signature', protect, restrictTo('professional'), professionalController.uploadSignature);
router.delete('/:id/signature', protect, restrictTo('professional'), professionalController.deleteSignature);

// ── Disponibilidad ──────────────────────────────────────────────────────
router.get(
	'/:professionalId/availability',
	protect,
	agendaReadLimiter,
	professionalController.getProfessionalAvailability
);

// ── Pacientes del profesional ───────────────────────────────────────────
router.get(
	'/:professionalId/patients',
	protect,
	restrictTo('professional'),
	professionalController.getProfessionalPatients
);

router.get(
	'/:professionalId/patients/:patientId',
	protect,
	restrictTo('professional'),
	professionalController.getProfessionalPatient
);

// ── Equipo médico del paciente ──────────────────────────────────────────
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
