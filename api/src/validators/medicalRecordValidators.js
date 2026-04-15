import { body } from 'express-validator';

const VALID_NEXT_CHECKUP = [
	'1_week', '2_weeks', '3_weeks', '4_weeks',
	'1_month', '2_months', '3_months', '4_months',
	'5_months', '6_months', '9_months', '12_months',
	'to_define',
];

export const createMedicalRecordValidator = [
	body('patientId')
		.isUUID().withMessage('patientId debe ser un UUID válido.'),

	body('appointmentId')
		.optional()
		.isUUID().withMessage('appointmentId debe ser un UUID válido.'),

	body('date')
		.optional()
		.isDate().withMessage('date debe ser una fecha válida (YYYY-MM-DD).'),

	body('reason')
		.notEmpty().withMessage('El motivo de consulta es requerido.')
		.isString().withMessage('El motivo de consulta debe ser texto.')
		.trim()
		.isLength({ min: 3, max: 5000 }).withMessage('El motivo de consulta debe tener entre 3 y 5000 caracteres.'),

	body('diagnosis')
		.notEmpty().withMessage('El análisis es requerido.')
		.isString().withMessage('El análisis debe ser texto.')
		.trim()
		.isLength({ min: 3, max: 10000 }).withMessage('El análisis debe tener entre 3 y 10000 caracteres.'),

	body('indications')
		.notEmpty().withMessage('Las indicaciones son requeridas.')
		.isString().withMessage('Las indicaciones deben ser texto.')
		.trim()
		.isLength({ min: 3, max: 10000 }).withMessage('Las indicaciones deben tener entre 3 y 10000 caracteres.'),

	body('evolution')
		.optional({ values: 'null' })
		.isString().withMessage('La evolución debe ser texto.')
		.trim()
		.isLength({ max: 10000 }).withMessage('La evolución no puede superar los 10000 caracteres.'),

	body('nextCheckup')
		.optional({ values: 'null' })
		.isIn(VALID_NEXT_CHECKUP)
		.withMessage(`nextCheckup debe ser uno de: ${VALID_NEXT_CHECKUP.join(', ')}`),

	body('vitalSigns')
		.optional()
		.isObject().withMessage('vitalSigns debe ser un objeto.'),
];

export const updateMedicalRecordValidator = [
	body('reason')
		.optional()
		.isString().withMessage('El motivo de consulta debe ser texto.')
		.trim()
		.isLength({ min: 3, max: 5000 }).withMessage('El motivo de consulta debe tener entre 3 y 5000 caracteres.'),

	body('diagnosis')
		.optional()
		.isString().withMessage('El análisis debe ser texto.')
		.trim()
		.isLength({ min: 3, max: 10000 }).withMessage('El análisis debe tener entre 3 y 10000 caracteres.'),

	body('indications')
		.optional()
		.isString().withMessage('Las indicaciones deben ser texto.')
		.trim()
		.isLength({ min: 3, max: 10000 }).withMessage('Las indicaciones deben tener entre 3 y 10000 caracteres.'),

	body('evolution')
		.optional({ values: 'null' })
		.isString().withMessage('La evolución debe ser texto.')
		.trim()
		.isLength({ max: 10000 }).withMessage('La evolución no puede superar los 10000 caracteres.'),

	body('nextCheckup')
		.optional({ values: 'null' })
		.isIn(VALID_NEXT_CHECKUP)
		.withMessage(`nextCheckup debe ser uno de: ${VALID_NEXT_CHECKUP.join(', ')}`),

	body('vitalSigns')
		.optional()
		.isObject().withMessage('vitalSigns debe ser un objeto.'),
];