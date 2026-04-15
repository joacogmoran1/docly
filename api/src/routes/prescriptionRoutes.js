import express from 'express';
import * as prescriptionController from '../controllers/prescriptionController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
    createPrescriptionValidator,
    updatePrescriptionValidator,
} from '../validators/prescriptionValidators.js';

const router = express.Router();

router.use(protect);

// ── Crear (solo profesionales, con validación) ──────────────────────────
router.post(
    '/',
    restrictTo('professional'),
    createPrescriptionValidator,
    validate,
    prescriptionController.create
);

// ── Leer por ID (paciente dueño o profesional emisor) ───────────────────
router.get('/:id', prescriptionController.getById);

// ── Descargar PDF (paciente dueño o profesional emisor) ─────────────────
router.get('/:id/download', prescriptionController.download);

// ── Leer por paciente (ese paciente o profesional vinculado) ────────────
router.get('/patient/:patientId', prescriptionController.getByPatient);

// ── Leer por profesional (solo ese profesional) ─────────────────────────
router.get('/professional/:professionalId', prescriptionController.getByProfessional);

// ── Actualizar (solo profesional emisor, con validación) ────────────────
router.put(
    '/:id',
    restrictTo('professional'),
    updatePrescriptionValidator,
    validate,
    prescriptionController.update
);

// ── Eliminar (solo profesional emisor) ──────────────────────────────────
router.delete(
    '/:id',
    restrictTo('professional'),
    prescriptionController.deletePrescription
);

export default router;