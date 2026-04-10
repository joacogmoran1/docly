import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const HealthInfo = db.define('HealthInfo', {
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
	diseases: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
	},
	allergies: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
	},
	medications: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
	},
	notes: {
		type: DataTypes.TEXT,
	},
});

export default HealthInfo;
