// src/routes/authRoutes.js
import express from 'express';
import * as authController from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidators.js';
import { validate } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/profile', protect, authController.getProfile);

export default router;
