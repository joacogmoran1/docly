import { body } from 'express-validator';

// Validacion de password consistente en registro y reset.
const passwordRules = body('password')
	.isLength({ min: 8 })
	.withMessage('La contrasena debe tener al menos 8 caracteres')
	.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
	.withMessage('La contrasena debe contener al menos una mayuscula, una minuscula y un numero');

// Honeypot opcional para bots: clientes reales nunca deberian completarlo.
const honeypotRule = body('website')
	.optional({ values: 'falsy' })
	.custom((value) => {
		if (String(value).trim() !== '') {
			throw new Error('Solicitud rechazada.');
		}

		return true;
	});

export const registerValidator = [
	honeypotRule,
	body('email').isEmail().withMessage('Email invalido').normalizeEmail(),
	passwordRules,
	body('name').notEmpty().trim().withMessage('El nombre es requerido'),
	body('role').isIn(['patient', 'professional']).withMessage('Rol invalido'),
	body('document')
		.optional({ values: 'falsy' })
		.isString()
		.withMessage('El documento debe ser texto.')
		.trim()
		.isLength({ max: 40 })
		.withMessage('El documento no puede superar 40 caracteres.'),
	body('acceptedTerms')
		.isBoolean()
		.withMessage('acceptedTerms debe ser booleano.')
		.custom((value) => {
			if (value !== true) {
				throw new Error('Debes aceptar los terminos y condiciones.');
			}

			return true;
		}),
	body('specialty')
		.if(body('role').equals('professional'))
		.notEmpty()
		.withMessage('La especialidad es requerida para profesionales'),
	body('licenseNumber')
		.if(body('role').equals('professional'))
		.notEmpty()
		.withMessage('La matricula es requerida para profesionales'),
];

export const loginValidator = [
	body('email').isEmail().withMessage('Email invalido'),
	body('password').notEmpty().withMessage('La contrasena es requerida'),
];

export const forgotPasswordValidator = [
	honeypotRule,
	body('email').isEmail().withMessage('Email invalido'),
];

export const resetPasswordValidator = [
	honeypotRule,
	body('token').notEmpty().withMessage('El token es requerido'),
	body('password')
		.isLength({ min: 8 })
		.withMessage('La contrasena debe tener al menos 8 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La contrasena debe contener al menos una mayuscula, una minuscula y un numero'),
];

export const changePasswordValidator = [
	body('currentPassword').notEmpty().withMessage('La contrasena actual es requerida'),
	body('newPassword')
		.isLength({ min: 8 })
		.withMessage('La nueva contrasena debe tener al menos 8 caracteres')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('La nueva contrasena debe contener al menos una mayuscula, una minuscula y un numero'),
];

export const changeEmailValidator = [
	body('newEmail').isEmail().withMessage('Email invalido').normalizeEmail(),
	body('password').notEmpty().withMessage('La contrasena es requerida'),
];

export const deleteAccountValidator = [
	body('password').notEmpty().withMessage('La contrasena es requerida para eliminar la cuenta'),
];
