import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Schedule = db.define('Schedule', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
	},
	officeId: {
		type: DataTypes.UUID,
		allowNull: false,
		field: 'office_id',
		references: {
			model: 'offices',
			key: 'id',
		},
		onDelete: 'CASCADE',
	},
	dayOfWeek: {
		type: DataTypes.INTEGER,
		allowNull: false,
		field: 'day_of_week',
		validate: {
			min: 0,
			max: 6,
		},
		comment:
			'0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado',
	},
	startTime: {
		type: DataTypes.TIME,
		allowNull: false,
		field: 'start_time',
		comment: 'Hora de inicio en formato HH:mm',
	},
	endTime: {
		type: DataTypes.TIME,
		allowNull: false,
		field: 'end_time',
		comment: 'Hora de fin en formato HH:mm',
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true,
		field: 'is_active',
	},
}, {
	tableName: 'schedules',
	underscored: true,
	timestamps: true,
});

export default Schedule;