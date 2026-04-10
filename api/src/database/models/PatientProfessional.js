import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const PatientProfessional = db.define('PatientProfessional', {
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
}, {
	indexes: [
		{
			unique: true,
			fields: ['patient_id', 'professional_id'],
		},
	],
});

export default PatientProfessional;
