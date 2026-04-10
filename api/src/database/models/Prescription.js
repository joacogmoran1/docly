import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Prescription = db.define('Prescription', {
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
	medications: {
		type: DataTypes.JSONB,
		allowNull: false,
	},
	diagnosis: {
		type: DataTypes.TEXT,
	},
	instructions: {
		type: DataTypes.TEXT,
	},
	validUntil: {
		type: DataTypes.DATEONLY,
		field: 'valid_until',
	},
});

export default Prescription;
