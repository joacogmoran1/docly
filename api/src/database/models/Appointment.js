import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Appointment = db.define('Appointment', {
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
	officeId: {
		type: DataTypes.UUID,
		allowNull: false,
		field: 'office_id',
		references: {
			model: 'offices',
			key: 'id',
		},
	},
	date: {
		type: DataTypes.DATEONLY,
		allowNull: false,
	},
	time: {
		type: DataTypes.TIME,
		allowNull: false,
	},
	duration: {
		type: DataTypes.INTEGER,
		defaultValue: 30,
	},
	status: {
		type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled'),
		defaultValue: 'scheduled',
	},
	reason: {
		type: DataTypes.STRING,
	},
	notes: {
		type: DataTypes.TEXT,
	},
	cancellationReason: {
		type: DataTypes.TEXT,
		field: 'cancellation_reason',
	},
}, {
	indexes: [
		{
			fields: ['date', 'time'],
		},
		{
			fields: ['patient_id'],
		},
		{
			fields: ['professional_id'],
		},
	],
});

export default Appointment;
