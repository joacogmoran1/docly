import express from 'express';
import * as studyController from '../controllers/studyController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Crear estudio (pacientes pueden agregar sus propios estudios)
router.post('/', studyController.create);

// Obtener estudio por ID
router.get('/:id', studyController.getById);

// Obtener estudios de un paciente
router.get('/patient/:patientId', studyController.getByPatient);

// Obtener estudios de un profesional
router.get('/professional/:professionalId', studyController.getByProfessional);

// Actualizar estudio
router.put('/:id', studyController.update);

// Eliminar estudio
router.delete('/:id', studyController.deleteStudy);

export default router;
