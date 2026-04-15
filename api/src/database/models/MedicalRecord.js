import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const MedicalRecord = db.define('MedicalRecord', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
	},
	patientId: {
		type: DataTypes.UUID,
		allowNull: false,
		field: 'patient_id',
		references: {
			model: 'patients',
			key: 'id',
		},
	},
	professionalId: {
		type: DataTypes.UUID,
		allowNull: false,
		field: 'professional_id',
		references: {
			model: 'professionals',
			key: 'id',
		},
	},
	appointmentId: {
		type: DataTypes.UUID,
		field: 'appointment_id',
		references: {
			model: 'appointments',
			key: 'id',
		},
	},
	date: {
		type: DataTypes.DATEONLY,
		allowNull: false,
		defaultValue: DataTypes.NOW,
	},

	// ── Campos clínicos ──────────────────────────────────────────────────

	/** Motivo de consulta — por qué vino el paciente */
	reason: {
		type: DataTypes.TEXT,
		allowNull: false,
		validate: {
			notEmpty: { msg: 'El motivo de consulta no puede estar vacío.' },
		},
	},

	/** Análisis — observaciones y diagnóstico del profesional */
	diagnosis: {
		type: DataTypes.TEXT,
		allowNull: false,
		validate: {
			notEmpty: { msg: 'El análisis no puede estar vacío.' },
		},
	},

	/** Indicaciones — plan de tratamiento, medicación, etc. */
	indications: {
		type: DataTypes.TEXT,
		allowNull: false,
		validate: {
			notEmpty: { msg: 'Las indicaciones no pueden estar vacías.' },
		},
	},

	/** Evolución — observaciones sobre la evolución del paciente (opcional) */
	evolution: {
		type: DataTypes.TEXT,
		allowNull: true,
	},

	/** Próximo control — intervalo sugerido para la siguiente consulta (opcional) */
	nextCheckup: {
		type: DataTypes.ENUM(
			'1_week', '2_weeks', '3_weeks', '4_weeks',
			'1_month', '2_months', '3_months', '4_months',
			'5_months', '6_months', '9_months', '12_months',
			'to_define'
		),
		allowNull: true,
		field: 'next_checkup',
		comment: 'Intervalo para próximo control: 1_week, 2_weeks, ..., 12_months, to_define',
	},

	// ── Datos clínicos complementarios ───────────────────────────────────

	/** Signos vitales registrados en la consulta */
	vitalSigns: {
		type: DataTypes.JSONB,
		field: 'vital_signs',
		defaultValue: {},
		comment: 'Ej: { bloodPressure: "120/80", heartRate: 72, temperature: 36.5, weight: 70 }',
	},
}, {
	indexes: [
		{ fields: ['patient_id'] },
		{ fields: ['professional_id'] },
		{ fields: ['date'] },
	],
});

export default MedicalRecord;