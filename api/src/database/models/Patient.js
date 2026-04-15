import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Patient = db.define('Patient', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
	},
	userId: {
		type: DataTypes.UUID,
		allowNull: false,
		field: 'user_id',
		references: {
			model: 'users',
			key: 'id',
		},
	},
	dni: {
		type: DataTypes.STRING,
		// ✅ FIX: Removido `unique: true` de acá.
		// Sequelize + sync({ alter: true }) genera SQL inválido:
		//   ALTER COLUMN "dni" TYPE VARCHAR(255) UNIQUE
		// PostgreSQL no acepta UNIQUE dentro de ALTER COLUMN TYPE.
		// La constraint se define abajo en `indexes`.
		field: 'dni',
		comment: 'Documento Nacional de Identidad',
	},
	birthDate: {
		type: DataTypes.DATEONLY,
		field: 'birth_date',
	},
	gender: {
		type: DataTypes.ENUM('male', 'female', 'other'),
	},
	bloodType: {
		type: DataTypes.STRING(10),
		field: 'blood_type',
	},
	medicalCoverage: {
		type: DataTypes.STRING,
		field: 'medical_coverage',
	},
	coverageNumber: {
		type: DataTypes.STRING,
		field: 'coverage_number',
	},
}, {
	indexes: [
		{
			unique: true,
			fields: ['dni'],
			name: 'patients_dni_unique',
		},
	],
});

export default Patient;