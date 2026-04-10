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
	// Análisis / Diagnóstico
	diagnosis: {
		type: DataTypes.TEXT,
		allowNull: false,
	},
	// Indicaciones / Plan de tratamiento
	treatment: {
		type: DataTypes.TEXT,
	},
	// Notas adicionales
	notes: {
		type: DataTypes.TEXT,
	},
	// Signos vitales
	vitalSigns: {
		type: DataTypes.JSONB,
		field: 'vital_signs',
		defaultValue: {},
		comment: 'Ej: { bloodPressure: "120/80", heartRate: 72, temperature: 36.5, weight: 70 }',
	},
}, {
	indexes: [
		{
			fields: ['patient_id'],
		},
		{
			fields: ['professional_id'],
		},
		{
			fields: ['date'],
		},
	],
});

export default MedicalRecord;
