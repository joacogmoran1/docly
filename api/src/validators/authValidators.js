import { body } from 'express-validator';

// Validación de password consistente en registro y reset
const passwordRules = body('password')
	.isLength({ min: 8 })
	.withMessage('La contraseña debe tener al menos 8 caracteres')
	.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
	.withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número');

export const registerValidator = [
	body('email')
		.isEmail().withMessage('Email inválido')
		.normalizeEmail(),
	passwordRules,
	body('name').notEmpty().trim().withMessage('El nombre es requerido'),
	body('role').isIn(['patient', 'professional']).withMessage('Rol inválido'),
	// Validar campos condicionales para profesional
	body('specialty')
		.if(body('role').equals('professional'))
		.notEmpty().withMessage('La especialidad es requerida para profesionales'),
	body('licenseNumber')
		.if(body('role').equals('professional'))
		.notEmpty().withMessage('La matrícula es requerida para profesionales'),
];

export const loginValidator = [
	body('email').isEmail().withMessage('Email inválido'),
	body('password').notEmpty().withMessage('La contraseña es requerida'),
];

export const forgotPasswordValidator = [
	body('email').isEmail().withMessage('Email inválido'),
];

export const resetPasswordValidator = [
	body('token').notEmpty().withMessage('El token es requerido'),
	body('password')
		.isLength({ min: 8 })
		.withMessage('La contraseña debe tener al menos 8 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
];

export const changePasswordValidator = [
	body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
	body('newPassword')
		.isLength({ min: 8 })
		.withMessage('La nueva contraseña debe tener al menos 8 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'),
];

export const changeEmailValidator = [
	body('newEmail')
		.isEmail().withMessage('Email inválido')
		.normalizeEmail(),
	body('password').notEmpty().withMessage('La contraseña es requerida'),
];

export const deleteAccountValidator = [
	body('password').notEmpty().withMessage('La contraseña es requerida para eliminar la cuenta'),
];