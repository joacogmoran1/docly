import express from 'express';
import * as professionalController from '../controllers/professionalController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Búsqueda pública (requiere auth pero cualquier rol)
router.get('/search', protect, professionalController.search);
router.get('/:id', protect, professionalController.getById);

// Actualización solo para profesionales
router.put('/:id', protect, restrictTo('professional'), professionalController.updateProfile);

// ⭐ NUEVO: Obtener disponibilidad del profesional (agenda con consultorios y horarios)
router.get('/:professionalId/availability', protect, professionalController.getProfessionalAvailability);

// ⭐ NUEVO: Obtener todos los pacientes del profesional
router.get(
	'/:professionalId/patients',
	protect,
	restrictTo('professional'),
	professionalController.getProfessionalPatients
);

// ⭐ NUEVO: Obtener un paciente específico del profesional con toda su info
router.get(
	'/:professionalId/patients/:patientId',
	protect,
	restrictTo('professional'),
	professionalController.getProfessionalPatient
);

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
