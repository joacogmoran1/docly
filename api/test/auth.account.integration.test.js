import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import authService from '../src/services/authService.js';
import { User } from '../src/database/models/index.js';
import {
	CookieJar,
	issueCsrfToken,
	requestJson,
	startTestServer,
	stopTestServer,
	withCsrf,
} from '../test-support/httpTestClient.js';
import { stubMethod } from '../test-support/stub.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FAMILY_ID = '22222222-2222-4222-8222-222222222222';

function stubAuthenticatedUser(restores, userId = USER_ID) {
	restores.push(
		stubMethod(jwt, 'verify', () => ({
			id: userId,
			type: 'access',
		}))
	);
	restores.push(
		stubMethod(User, 'findByPk', async () => ({
			id: userId,
			email: 'qa-auth@example.com',
			role: 'patient',
			isActive: true,
			patient: { id: 'patient-1' },
			professional: null,
		}))
	);
}

test('POST /api/auth/refresh valida la refresh cookie y reemite tokens en la misma familia', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedRefreshToken = null;
	let setCookieCall = null;

	try {
		restores.push(
			stubMethod(authService, 'refreshSession', async (refreshTokenJwt) => {
				receivedRefreshToken = refreshTokenJwt;
				return {
					user: { id: USER_ID, email: 'qa-refresh@example.com' },
					family: FAMILY_ID,
				};
			})
		);
		restores.push(
			stubMethod(authService, 'setAuthCookies', async (res, userId, family) => {
				setCookieCall = { userId, family };
				res.cookie('token', 'rotated-access-token', { path: '/' });
				res.cookie('refresh_token', 'rotated-refresh-token', { path: '/api/auth' });
			})
		);

		const jar = new CookieJar();
		jar.cookies.set('refresh_token', 'refresh-cookie-value');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/refresh', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(receivedRefreshToken, 'refresh-cookie-value');
		assert.deepEqual(setCookieCall, { userId: USER_ID, family: FAMILY_ID });
		assert.equal(response.body?.success, true);
		assert.equal(response.body?.user?.id, USER_ID);
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/auth/logout revoca usando la refresh cookie y limpia las cookies auth', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedRefreshToken = null;

	try {
		restores.push(
			stubMethod(authService, 'logout', async (refreshTokenJwt) => {
				receivedRefreshToken = refreshTokenJwt;
			})
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		jar.cookies.set('refresh_token', 'refresh-cookie-value');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/logout', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(receivedRefreshToken, 'refresh-cookie-value');
		assert.equal(response.body?.success, true);
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=;')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=;')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/auth/logout con cookies reales y sin header CSRF devuelve 403', async () => {
	const server = startTestServer();

	try {
		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		jar.cookies.set('refresh_token', 'refresh-cookie-value');
		await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/logout', {
			method: 'POST',
			jar,
			headers: {
				Accept: 'application/json',
				'X-Requested-With': 'XMLHttpRequest',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.match(response.rawBody, /CSRF/i);
	} finally {
		await stopTestServer(server);
	}
});

test('POST /api/auth/forgot-password procesa la solicitud con CSRF valido', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(
			stubMethod(authService, 'forgotPassword', async (email) => ({
				message: 'Si el email existe, recibiras un enlace de reseteo.',
				email,
			}))
		);

		const { jar, csrfToken } = await issueCsrfToken(server);
		const response = await requestJson(server, '/api/auth/forgot-password', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				email: 'qa-forgot@example.com',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.success, true);
		assert.equal(response.body?.message, 'Si el email existe, recibiras un enlace de reseteo.');
		assert.equal(response.body?.email, 'qa-forgot@example.com');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/auth/reset-password limpia las cookies y devuelve exito', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(
			stubMethod(authService, 'resetPassword', async (token, password) => ({
				message: `password rotated for ${token}:${password}`,
			}))
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		jar.cookies.set('refresh_token', 'refresh-cookie');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/reset-password', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				token: 'reset-token',
				password: 'NuevaClave1',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.success, true);
		assert.equal(response.body?.message, 'password rotated for reset-token:NuevaClave1');
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=;')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=;')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/auth/change-password usa protect y reemite cookies de sesion', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;
	let setCookieUserId = null;

	try {
		stubAuthenticatedUser(restores);
		restores.push(
			stubMethod(authService, 'changePassword', async (userId, currentPassword, newPassword) => {
				receivedPayload = { userId, currentPassword, newPassword };
				return { message: 'Contrasena cambiada exitosamente.' };
			})
		);
		restores.push(
			stubMethod(authService, 'setAuthCookies', async (res, userId) => {
				setCookieUserId = userId;
				res.cookie('token', 'updated-access-token', { path: '/' });
				res.cookie('refresh_token', 'updated-refresh-token', { path: '/api/auth' });
			})
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/change-password', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				currentPassword: 'Actual123',
				newPassword: 'NuevaClave1',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(receivedPayload, {
			userId: USER_ID,
			currentPassword: 'Actual123',
			newPassword: 'NuevaClave1',
		});
		assert.equal(setCookieUserId, USER_ID);
		assert.equal(response.body?.message, 'Contrasena cambiada exitosamente.');
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/auth/change-email usa protect y devuelve el resultado del servicio', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;

	try {
		stubAuthenticatedUser(restores);
		restores.push(
			stubMethod(authService, 'changeEmail', async (userId, newEmail, password) => {
				receivedPayload = { userId, newEmail, password };
				return { message: 'Email actualizado exitosamente.' };
			})
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/change-email', {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				newEmail: 'nuevo@example.com',
				password: 'Actual123',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(receivedPayload, {
			userId: USER_ID,
			newEmail: 'nuevo@example.com',
			password: 'Actual123',
		});
		assert.equal(response.body?.message, 'Email actualizado exitosamente.');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/auth/account usa protect, desactiva la cuenta y limpia cookies', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;
	const requestBody = {
		password: 'Actual123',
	};

	try {
		stubAuthenticatedUser(restores);
		restores.push(
			stubMethod(authService, 'deleteAccount', async (userId, password) => {
				receivedPayload = { userId, password };
				return { message: 'Cuenta eliminada exitosamente.' };
			})
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-cookie');
		jar.cookies.set('refresh_token', 'refresh-cookie');
		const { csrfToken } = await issueCsrfToken(server, jar);

		const response = await requestJson(server, '/api/auth/account', {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken, {
				'Content-Length': String(Buffer.byteLength(JSON.stringify(requestBody))),
			}),
			body: requestBody,
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(receivedPayload, {
			userId: USER_ID,
			password: 'Actual123',
		});
		assert.equal(response.body?.message, 'Cuenta eliminada exitosamente.');
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=;')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=;')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
