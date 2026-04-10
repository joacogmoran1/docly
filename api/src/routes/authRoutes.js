import express from 'express';
import * as authController from '../controllers/authController.js';
import { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, changePasswordValidator } from '../validators/authValidators.js';
import { validate } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Registro
router.post('/register', registerValidator, validate, authController.register);

// Login con rate limiting
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// Logout
router.post('/logout', authController.logout);

// Perfil del usuario autenticado
router.get('/profile', protect, authController.getProfile);

// Solicitar reseteo de contraseña
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);

// Resetear contraseña con token
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Cambiar contraseña (requiere autenticación)
router.post('/change-password', protect, changePasswordValidator, validate, authController.changePassword);

export default router;
