import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Study = db.define('Study', {
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
		field: 'professional_id',
		references: {
			model: 'professionals',
			key: 'id',
		},
	},
	type: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	date: {
		type: DataTypes.DATEONLY,
		allowNull: false,
	},
	results: {
		type: DataTypes.TEXT,
	},
	fileUrl: {
		type: DataTypes.STRING,
		field: 'file_url',
	},
	notes: {
		type: DataTypes.TEXT,
	},
});

export default Study;
