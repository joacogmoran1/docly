import { DataTypes, Op } from 'sequelize';
import db from '../../config/database.js';

const RefreshToken = db.define('RefreshToken', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true,
		comment: 'Also used as jti in the refresh JWT',
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
	/**
	 * Token family: all tokens derived from the same login share a family UUID.
	 * If a revoked token is reused, the entire family gets revoked (compromise detection).
	 */
	family: {
		type: DataTypes.UUID,
		allowNull: false,
		defaultValue: DataTypes.UUIDV4,
	},
	expiresAt: {
		type: DataTypes.DATE,
		allowNull: false,
		field: 'expires_at',
	},
	revokedAt: {
		type: DataTypes.DATE,
		allowNull: true,
		field: 'revoked_at',
		comment: 'null = active, set = revoked',
	},
}, {
	tableName: 'refresh_tokens',
	underscored: true,
	timestamps: true,
	indexes: [
		{
			fields: ['user_id'],
			name: 'refresh_tokens_user_id',
		},
		{
			fields: ['family'],
			name: 'refresh_tokens_family',
		},
		{
			fields: ['expires_at'],
			name: 'refresh_tokens_expires_at',
		},
	],
});

/**
 * Revoke a single token by setting revokedAt.
 */
RefreshToken.revokeById = async function (tokenId) {
	return await RefreshToken.update(
		{ revokedAt: new Date() },
		{ where: { id: tokenId, revokedAt: null } }
	);
};

/**
 * Revoke all tokens in a family (compromise detection).
 */
RefreshToken.revokeFamily = async function (family) {
	return await RefreshToken.update(
		{ revokedAt: new Date() },
		{ where: { family, revokedAt: null } }
	);
};

/**
 * Revoke all active tokens for a user (logout from all devices).
 */
RefreshToken.revokeAllForUser = async function (userId) {
	return await RefreshToken.update(
		{ revokedAt: new Date() },
		{ where: { userId, revokedAt: null } }
	);
};

RefreshToken.cleanup = async function ({ now = new Date() } = {}) {
	return await RefreshToken.destroy({
		where: {
			expiresAt: { [Op.lt]: now },
		},
	});
};

export default RefreshToken;
