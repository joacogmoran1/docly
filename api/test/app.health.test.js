import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

function request(server, path, options = {}) {
	return new Promise((resolve, reject) => {
		const address = server.address();
		const req = http.request(
			{
				host: '127.0.0.1',
				port: address.port,
				path,
				method: options.method || 'GET',
				headers: options.headers || {},
			},
			(res) => {
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: data,
					});
				});
			}
		);

		req.on('error', reject);
		if (options.body) {
			req.write(options.body);
		}
		req.end();
	});
}

test('GET /api/health/live responde 200', async () => {
	const server = app.listen(0);

	try {
		const response = await request(server, '/api/health/live');
		assert.equal(response.statusCode, 200);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

test('GET /api/auth/csrf-token emite cookie csrf', async () => {
	const server = app.listen(0);

	try {
		const response = await request(server, '/api/auth/csrf-token');
		assert.equal(response.statusCode, 200);
		assert.ok(
			response.headers['set-cookie']?.some((cookie) => cookie.startsWith('csrf_token=')),
			'Se esperaba la cookie csrf_token'
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

test('POST /api/auth/logout sin CSRF devuelve 403', async () => {
	const server = app.listen(0);

	try {
		const response = await request(server, '/api/auth/logout', { method: 'POST' });
		assert.equal(response.statusCode, 403);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
