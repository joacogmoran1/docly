import express from 'express';
import * as medicalRecordController from '../controllers/medicalRecordController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
    createMedicalRecordValidator,
    updateMedicalRecordValidator,
} from '../validators/medicalRecordValidators.js';

const router = express.Router();

router.use(protect);

// Crear (solo profesionales, con validación)
router.post(
    '/',
    restrictTo('professional'),
    createMedicalRecordValidator,
    validate,
    medicalRecordController.create
);

// Leer
router.get('/:id', medicalRecordController.getById);
router.get('/patient/:patientId', medicalRecordController.getByPatient);
router.get('/professional/:professionalId', medicalRecordController.getByProfessional);

// Actualizar (solo profesionales, con validación)
router.put(
    '/:id',
    restrictTo('professional'),
    updateMedicalRecordValidator,
    validate,
    medicalRecordController.update
);

// Eliminar (solo profesionales)
router.delete('/:id', restrictTo('professional'), medicalRecordController.deleteRecord);

export default router;