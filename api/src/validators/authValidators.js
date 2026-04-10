import { body } from 'express-validator';

export const registerValidator = [
	body('email').isEmail().withMessage('Email inválido'),
	body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
	body('name').notEmpty().withMessage('El nombre es requerido'),
	body('role').isIn(['patient', 'professional']).withMessage('Rol inválido'),
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
		.isLength({ min: 6 })
		.withMessage('La contraseña debe tener al menos 6 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
];

export const changePasswordValidator = [
	body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
	body('newPassword')
		.isLength({ min: 6 })
		.withMessage('La nueva contraseña debe tener al menos 6 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'),
];
