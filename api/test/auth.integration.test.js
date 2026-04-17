import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import authService from '../src/services/authService.js';
import ApiError from '../src/utils/ApiError.js';
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

test('POST /api/auth/register valida CSRF, devuelve 201 y emite cookies de sesion', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(
			stubMethod(authService, 'register', async (payload) => ({
				user: {
					id: 'user-1',
					email: payload.email,
					role: payload.role,
				},
			}))
		);
		restores.push(
			stubMethod(authService, 'setAuthCookies', async (res) => {
				res.cookie('token', 'access-token', { path: '/' });
				res.cookie('refresh_token', 'refresh-token', { path: '/api/auth' });
				res.cookie('csrf_token', 'csrf-token', { path: '/' });
			})
		);

		const { jar, csrfToken } = await issueCsrfToken(server);
		const response = await requestJson(server, '/api/auth/register', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				email: 'qa-register@example.com',
				password: 'Password123',
				name: 'QA',
				role: 'patient',
				acceptedTerms: true,
			},
		});

		assert.equal(response.statusCode, 201);
		assert.equal(response.body?.success, true);
		assert.equal(response.body?.user?.email, 'qa-register@example.com');
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('token=')));
		assert.ok(response.headers['set-cookie']?.some((cookie) => cookie.startsWith('refresh_token=')));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/auth/login aplica rate limiting progresivo ante brute force', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(
			stubMethod(authService, 'login', async () => {
				throw new ApiError(401, 'Credenciales incorrectas.');
			})
		);

		const { jar, csrfToken } = await issueCsrfToken(server);
		let lastResponse = null;

		for (let attempt = 0; attempt < 11; attempt += 1) {
			lastResponse = await requestJson(server, '/api/auth/login', {
				method: 'POST',
				jar,
				headers: withCsrf(csrfToken),
				body: {
					email: 'qa-bruteforce@example.com',
					password: 'WrongPassword123',
				},
			});
		}

		assert.equal(lastResponse?.statusCode, 429);
		assert.match(lastResponse?.body?.message || '', /autenticaci/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/auth/profile usa el middleware protect y renueva la cookie CSRF', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(
			stubMethod(jwt, 'verify', () => ({
				id: 'user-1',
				type: 'access',
			}))
		);
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: 'user-1',
				email: 'qa-profile@example.com',
				role: 'patient',
				isActive: true,
				patient: { id: 'patient-1' },
				professional: null,
			}))
		);
		restores.push(
			stubMethod(authService, 'getProfile', async () => ({
				id: 'user-1',
				email: 'qa-profile@example.com',
				role: 'patient',
			}))
		);

		const jar = new CookieJar();
		jar.cookies.set('token', 'access-token');

		const response = await requestJson(server, '/api/auth/profile', {
			jar,
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.user?.id, 'user-1');
		assert.ok(
			response.headers['set-cookie']?.some((cookie) => cookie.startsWith('csrf_token=')),
			'Se esperaba una nueva cookie csrf_token'
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
