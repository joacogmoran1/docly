import express from 'express';
import * as officeController from '../controllers/officeController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// ── CRUD Consultorios ────────────────────────────────────────────────────
router.post('/', restrictTo('professional'), officeController.create);
router.get('/:id', officeController.getById);
router.get('/professional/:professionalId', officeController.getByProfessional);
router.put('/:id', restrictTo('professional'), officeController.update);
router.delete('/:id', restrictTo('professional'), officeController.deleteOffice);

// ── Bloqueos (solo profesionales) ────────────────────────────────────────
router.post('/:officeId/blocks/day', restrictTo('professional'), officeController.blockDay);
router.post('/:officeId/blocks/time-slots', restrictTo('professional'), officeController.blockTimeSlots);
router.get('/:officeId/blocks', officeController.getBlocks);
router.delete('/:officeId/blocks/:blockId', restrictTo('professional'), officeController.deleteBlock);

// ── Cancelación en lote (solo profesionales) ─────────────────────────────
router.post('/:officeId/cancel-day', restrictTo('professional'), officeController.cancelDay);

export default router;