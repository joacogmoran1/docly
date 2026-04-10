// src/validators/authValidators.js
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
