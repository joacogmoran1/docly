import express from 'express';
import * as medicalRecordController from '../controllers/medicalRecordController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Crear registro médico (solo profesionales)
router.post('/', restrictTo('professional'), medicalRecordController.create);

// Obtener registro por ID
router.get('/:id', medicalRecordController.getById);

// Obtener registros de un paciente
router.get('/patient/:patientId', medicalRecordController.getByPatient);

// Obtener registros de un profesional
router.get('/professional/:professionalId', medicalRecordController.getByProfessional);

// Actualizar registro (solo profesionales)
router.put('/:id', restrictTo('professional'), medicalRecordController.update);

// Eliminar registro (solo profesionales)
router.delete('/:id', restrictTo('professional'), medicalRecordController.deleteRecord);

export default router;
