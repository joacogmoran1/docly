import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Office = db.define('Office', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
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
	name: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	address: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	phone: {
		type: DataTypes.STRING,
	},
	appointmentDuration: {
		type: DataTypes.INTEGER,
		defaultValue: 30,
		field: 'appointment_duration',
	},
});

export default Office;
