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
		unique: true,
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
});

export default Professional;
