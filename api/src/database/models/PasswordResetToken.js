import { DataTypes, Op } from 'sequelize';
import db from '../../config/database.js';
import crypto from 'crypto';

const PasswordResetToken = db.define('PasswordResetToken', {
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
	token: {
		type: DataTypes.STRING,
		allowNull: false,
		// ✅ FIX: Removido `unique: true` — misma razón que los demás modelos.
	},
	expiresAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: 'expires_at',
	},
	used: {
		type: DataTypes.BOOLEAN,
		defaultValue: false,
	},
}, {
	indexes: [
		{
			unique: true,
			fields: ['token'],
			name: 'password_reset_tokens_token_unique',
		},
	],
});

// Método estático para generar token
PasswordResetToken.generateToken = function () {
	return crypto.randomBytes(32).toString('hex');
};

PasswordResetToken.hashToken = function (token) {
	return crypto.createHash('sha256').update(token).digest('hex');
};

// Método estático para crear token con expiración
PasswordResetToken.createForUser = async function (userId) {
	// Invalidar tokens anteriores
	await PasswordResetToken.update(
		{ used: true },
		{ where: { userId, used: false } }
	);

	const token = this.generateToken();
	const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

	const resetToken = await PasswordResetToken.create({
		userId,
		token: this.hashToken(token),
		expiresAt,
	});

	return {
		token,
		expiresAt: resetToken.expiresAt,
	};
};

PasswordResetToken.cleanup = async function ({ now = new Date() } = {}) {
	return await PasswordResetToken.destroy({
		where: {
			[Op.or]: [
				{ used: true },
				{ expiresAt: { [Op.lt]: now } },
			],
		},
	});
};

export default PasswordResetToken;
