import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import authService from '../src/services/authService.js';
import emailService from '../src/services/emailService.js';
import PasswordResetToken from '../src/database/models/PasswordResetToken.js';
import { jwtConfig } from '../src/config/jwt.js';
import ApiError from '../src/utils/ApiError.js';
import { RefreshToken, User } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

const USER_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN_ID = '44444444-4444-4444-8444-444444444444';
const FAMILY_ID = '55555555-5555-4555-8555-555555555555';

function createRefreshTokenJwt({
	userId = USER_ID,
	jti = TOKEN_ID,
	family = FAMILY_ID,
} = {}) {
	return jwt.sign(
		{ id: userId, type: 'refresh', jti, family },
		jwtConfig.secret,
		{ expiresIn: jwtConfig.refreshExpiresIn }
	);
}

test('AuthService.refreshSession rota un refresh token valido y mantiene la familia', async () => {
	const restores = [];
	let revokedTokenId = null;

	try {
		restores.push(
			stubMethod(RefreshToken, 'findByPk', async (tokenId) => {
				assert.equal(tokenId, TOKEN_ID);
				return {
					id: TOKEN_ID,
					userId: USER_ID,
					family: FAMILY_ID,
					expiresAt: new Date(Date.now() + 60_000),
					revokedAt: null,
				};
			})
		);
		restores.push(
			stubMethod(User, 'findByPk', async (userId) => {
				assert.equal(userId, USER_ID);
				return {
					id: USER_ID,
					isActive: true,
					toJSON() {
						return { id: USER_ID, email: 'qa-refresh@example.com' };
					},
				};
			})
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeById', async (tokenId) => {
				revokedTokenId = tokenId;
			})
		);

		const result = await authService.refreshSession(createRefreshTokenJwt());

		assert.equal(revokedTokenId, TOKEN_ID);
		assert.equal(result.family, FAMILY_ID);
		assert.deepEqual(result.user, { id: USER_ID, email: 'qa-refresh@example.com' });
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.refreshSession detecta reutilizacion y revoca la familia completa', async () => {
	const restores = [];
	let revokedFamily = null;

	try {
		restores.push(
			stubMethod(RefreshToken, 'findByPk', async () => ({
				id: TOKEN_ID,
				userId: USER_ID,
				family: FAMILY_ID,
				expiresAt: new Date(Date.now() + 60_000),
				revokedAt: new Date(),
			}))
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeFamily', async (family) => {
				revokedFamily = family;
			})
		);

		await assert.rejects(
			() => authService.refreshSession(createRefreshTokenJwt()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 401);
				assert.match(error.message, /comprometida/i);
				return true;
			}
		);
		assert.equal(revokedFamily, FAMILY_ID);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.resetPassword marca el token como usado y revoca todas las sesiones', async () => {
	const restores = [];
	let userUpdatePayload = null;
	let tokenUpdatePayload = null;
	let revokedUserId = null;

	try {
		restores.push(
			stubMethod(PasswordResetToken, 'findOne', async ({ where }) => {
				assert.equal(where.token, PasswordResetToken.hashToken('reset-token'));
				assert.equal(where.used, false);
				return {
					userId: USER_ID,
					expiresAt: new Date(Date.now() + 60_000),
					async update(payload) {
						tokenUpdatePayload = payload;
					},
				};
			})
		);
		restores.push(
			stubMethod(User, 'findByPk', async (userId) => {
				assert.equal(userId, USER_ID);
				return {
					id: USER_ID,
					async update(payload) {
						userUpdatePayload = payload;
					},
				};
			})
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeAllForUser', async (userId) => {
				revokedUserId = userId;
			})
		);

		const result = await authService.resetPassword('reset-token', 'NuevaClave1');

		assert.match(result.message, /actualizada exitosamente/i);
		assert.match(result.message, /nueva contrase/i);
		assert.deepEqual(userUpdatePayload, { password: 'NuevaClave1' });
		assert.deepEqual(tokenUpdatePayload, { used: true });
		assert.equal(revokedUserId, USER_ID);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.changePassword actualiza la clave y revoca refresh tokens del usuario', async () => {
	const restores = [];
	let userUpdatePayload = null;
	let revokedUserId = null;

	try {
		restores.push(
			stubMethod(User, 'findByPk', async (userId) => {
				assert.equal(userId, USER_ID);
				return {
					id: USER_ID,
					async comparePassword(password) {
						return password === 'Actual123';
					},
					async update(payload) {
						userUpdatePayload = payload;
					},
				};
			})
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeAllForUser', async (userId) => {
				revokedUserId = userId;
			})
		);

		const result = await authService.changePassword(USER_ID, 'Actual123', 'NuevaClave1');

		assert.match(result.message, /cambiada exitosamente/i);
		assert.deepEqual(userUpdatePayload, { password: 'NuevaClave1' });
		assert.equal(revokedUserId, USER_ID);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.changeEmail actualiza el email y notifica el cambio', async () => {
	const restores = [];
	let userUpdatePayload = null;
	let notificationArgs = null;

	try {
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: USER_ID,
				email: 'anterior@example.com',
				async comparePassword(password) {
					return password === 'Actual123';
				},
				async update(payload) {
					userUpdatePayload = payload;
				},
			}))
		);
		restores.push(stubMethod(User, 'findOne', async () => null));
		restores.push(
			stubMethod(emailService, 'sendEmailChangeNotification', async (oldEmail, newEmail) => {
				notificationArgs = { oldEmail, newEmail };
			})
		);

		const result = await authService.changeEmail(USER_ID, 'nuevo@example.com', 'Actual123');

		assert.equal(result.message, 'Email actualizado exitosamente.');
		assert.deepEqual(userUpdatePayload, { email: 'nuevo@example.com' });
		assert.deepEqual(notificationArgs, {
			oldEmail: 'anterior@example.com',
			newEmail: 'nuevo@example.com',
		});
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.deleteAccount desactiva la cuenta y revoca refresh tokens', async () => {
	const restores = [];
	let userUpdatePayload = null;
	let revokedUserId = null;
	let notificationEmail = null;

	try {
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: USER_ID,
				email: 'baja@example.com',
				async comparePassword(password) {
					return password === 'Actual123';
				},
				async update(payload) {
					userUpdatePayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeAllForUser', async (userId) => {
				revokedUserId = userId;
			})
		);
		restores.push(
			stubMethod(emailService, 'sendAccountDeletedNotification', async (email) => {
				notificationEmail = email;
			})
		);

		const result = await authService.deleteAccount(USER_ID, 'Actual123');

		assert.equal(result.message, 'Cuenta eliminada exitosamente.');
		assert.deepEqual(userUpdatePayload, { isActive: false });
		assert.equal(revokedUserId, USER_ID);
		assert.equal(notificationEmail, 'baja@example.com');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AuthService.logout revoca la familia usando un refresh token JWT real', async () => {
	const restores = [];
	let revokedFamily = null;

	try {
		restores.push(
			stubMethod(RefreshToken, 'findByPk', async (tokenId) => {
				assert.equal(tokenId, TOKEN_ID);
				return {
					id: TOKEN_ID,
					family: FAMILY_ID,
				};
			})
		);
		restores.push(
			stubMethod(RefreshToken, 'revokeFamily', async (family) => {
				revokedFamily = family;
			})
		);

		await authService.logout(createRefreshTokenJwt());

		assert.equal(revokedFamily, FAMILY_ID);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
