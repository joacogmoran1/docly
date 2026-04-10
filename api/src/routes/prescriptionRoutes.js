import express from 'express';
import * as prescriptionController from '../controllers/prescriptionController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Crear receta (solo profesionales)
router.post('/', restrictTo('professional'), prescriptionController.create);

// Obtener receta por ID
router.get('/:id', prescriptionController.getById);

// Obtener recetas de un paciente
router.get('/patient/:patientId', prescriptionController.getByPatient);

// Obtener recetas de un profesional
router.get('/professional/:professionalId', prescriptionController.getByProfessional);

// Actualizar receta (solo profesionales)
router.put('/:id', restrictTo('professional'), prescriptionController.update);

// Eliminar receta (solo profesionales)
router.delete('/:id', restrictTo('professional'), prescriptionController.deletePrescription);

export default router;
