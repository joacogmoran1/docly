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
		comment: 'Enfermedades del paciente',
	},
	allergies: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
		comment: 'Alergias del paciente',
	},
	medications: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
		comment: 'Medicación habitual del paciente',
	},
});

export default HealthInfo;
