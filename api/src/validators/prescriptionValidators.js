import { body } from 'express-validator';

export const createPrescriptionValidator = [
    body('patientId')
        .isUUID().withMessage('patientId debe ser un UUID válido.'),

    // medications: array con al menos 1 elemento
    body('medications')
        .isArray({ min: 1 }).withMessage('medications debe ser un array con al menos 1 medicamento.'),

    // Cada medicamento: name y dose requeridos, frequency y duration opcionales
    body('medications.*.name')
        .notEmpty().withMessage('El nombre del medicamento es requerido.')
        .isString().withMessage('El nombre del medicamento debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('El nombre del medicamento no puede superar 500 caracteres.'),

    body('medications.*.dose')
        .notEmpty().withMessage('La dosis es requerida.')
        .isString().withMessage('La dosis debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La dosis no puede superar 500 caracteres.'),

    body('medications.*.frequency')
        .optional()
        .isString().withMessage('La frecuencia debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La frecuencia no puede superar 500 caracteres.'),

    body('medications.*.duration')
        .optional()
        .isString().withMessage('La duración debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La duración no puede superar 500 caracteres.'),

    body('diagnosis')
        .optional()
        .isString().withMessage('El diagnóstico debe ser texto.')
        .trim()
        .isLength({ max: 5000 }).withMessage('El diagnóstico no puede superar 5000 caracteres.'),

    body('instructions')
        .optional()
        .isString().withMessage('Las instrucciones deben ser texto.')
        .trim()
        .isLength({ max: 5000 }).withMessage('Las instrucciones no pueden superar 5000 caracteres.'),

    body('validUntil')
        .optional({ values: 'null' })
        .isDate().withMessage('validUntil debe ser una fecha válida (YYYY-MM-DD).'),
];

export const updatePrescriptionValidator = [
    body('medications')
        .optional()
        .isArray({ min: 1 }).withMessage('medications debe ser un array con al menos 1 medicamento.'),

    body('medications.*.name')
        .if(body('medications').exists())
        .notEmpty().withMessage('El nombre del medicamento es requerido.')
        .isString().withMessage('El nombre del medicamento debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('El nombre del medicamento no puede superar 500 caracteres.'),

    body('medications.*.dose')
        .if(body('medications').exists())
        .notEmpty().withMessage('La dosis es requerida.')
        .isString().withMessage('La dosis debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La dosis no puede superar 500 caracteres.'),

    body('medications.*.frequency')
        .optional()
        .isString().withMessage('La frecuencia debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La frecuencia no puede superar 500 caracteres.'),

    body('medications.*.duration')
        .optional()
        .isString().withMessage('La duración debe ser texto.')
        .trim()
        .isLength({ max: 500 }).withMessage('La duración no puede superar 500 caracteres.'),

    body('diagnosis')
        .optional()
        .isString().withMessage('El diagnóstico debe ser texto.')
        .trim()
        .isLength({ max: 5000 }).withMessage('El diagnóstico no puede superar 5000 caracteres.'),

    body('instructions')
        .optional()
        .isString().withMessage('Las instrucciones deben ser texto.')
        .trim()
        .isLength({ max: 5000 }).withMessage('Las instrucciones no pueden superar 5000 caracteres.'),

    body('validUntil')
        .optional({ values: 'null' })
        .isDate().withMessage('validUntil debe ser una fecha válida (YYYY-MM-DD).'),
];