import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import db from '../../config/database.js';

const User = db.define('User', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
	},
	email: {
		type: DataTypes.STRING,
		allowNull: false,
		validate: {
			isEmail: true,
		},
	},
	password: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	name: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	lastName: {
		type: DataTypes.STRING,
		field: 'last_name',
	},
	phone: {
		type: DataTypes.STRING,
	},
	role: {
		type: DataTypes.ENUM('patient', 'professional'),
		allowNull: false,
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true,
		field: 'is_active',
	},
	/**
	 * Timestamp de aceptación de términos y condiciones.
	 * null → no aceptó (cuentas legacy pre-migración).
	 */
	acceptedTermsAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: 'accepted_terms_at',
		comment: 'Fecha y hora en que el usuario aceptó los términos de uso.',
	},
}, {
	indexes: [
		{
			unique: true,
			fields: ['email'],
			name: 'users_email_unique',
		},
	],
	hooks: {
		beforeCreate: async (user) => {
			if (user.password) {
				user.password = await bcrypt.hash(user.password, 12);
			}
		},
		beforeUpdate: async (user) => {
			if (user.changed('password')) {
				user.password = await bcrypt.hash(user.password, 12);
			}
		},
	},
});

// Método de instancia para comparar passwords
User.prototype.comparePassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

// No devolver password en JSON
User.prototype.toJSON = function () {
	const values = { ...this.get() };
	delete values.password;
	return values;
};

export default User;
