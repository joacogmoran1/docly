// src/routes/officeRoutes.js
import express from 'express';
import * as officeController from '../controllers/officeController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', restrictTo('professional'), officeController.create);
router.get('/:id', officeController.getById);
router.get('/professional/:professionalId', officeController.getByProfessional);
router.put('/:id', restrictTo('professional'), officeController.update);
router.delete('/:id', restrictTo('professional'), officeController.deleteOffice);

export default router;
