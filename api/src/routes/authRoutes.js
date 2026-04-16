import express from 'express';
import * as authController from '../controllers/authController.js';
import {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
    changeEmailValidator,
    deleteAccountValidator,
} from '../validators/authValidators.js';
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

// Refresh token — renueva access token usando el refresh token httpOnly cookie.
// Rate limiting para prevenir abuso (más permisivo que login).
router.post('/refresh', authLimiter, authController.refresh);

// Perfil del usuario autenticado
router.get('/profile', protect, authController.getProfile);

// Solicitar reseteo de contraseña
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);

// Resetear contraseña con token
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Cambiar contraseña (requiere autenticación)
router.post('/change-password', protect, changePasswordValidator, validate, authController.changePassword);

// Cambiar email (requiere autenticación)
router.put('/change-email', protect, changeEmailValidator, validate, authController.changeEmail);

// Eliminar cuenta (requiere autenticación)
router.delete('/account', protect, deleteAccountValidator, validate, authController.deleteAccount);

export default router;
