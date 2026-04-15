import { DataTypes } from 'sequelize';
import db from '../../config/database.js';

const Professional = db.define('Professional', {
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
	specialty: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	licenseNumber: {
		type: DataTypes.STRING,
		allowNull: false,
		// ✅ FIX: Removido `unique: true` — mismo bug que Patient.dni
		// Se define en `indexes` abajo.
		field: 'license_number',
	},
	acceptedCoverages: {
		type: DataTypes.ARRAY(DataTypes.STRING),
		defaultValue: [],
		field: 'accepted_coverages',
	},
	fees: {
		type: DataTypes.DECIMAL(10, 2),
	},
	/** Firma digital del profesional — base64 de la imagen (PNG/JPEG) */
	signature: {
		type: DataTypes.TEXT,
		allowNull: true,
		comment: 'Firma del profesional en formato data URI base64',
	},
}, {
	indexes: [
		{
			unique: true,
			fields: ['license_number'],
			name: 'professionals_license_number_unique',
		},
	],
});

export default Professional;