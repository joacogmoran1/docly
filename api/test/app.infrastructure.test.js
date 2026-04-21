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
						rawBody: data,
						body: data ? JSON.parse(data) : null,
					});
				});
			}
		);

		req.on('error', reject);
		req.end();
	});
}

test('CORS bloquea origins no permitidos en /api', async () => {
	const server = app.listen(0);

	try {
		const response = await request(server, '/api/health/live', {
			headers: {
				Origin: 'https://evil.example.com',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.match(response.body?.message || '', /origen no permitido por cors/i);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

test('GET /api/ruta-inexistente devuelve 404 con mensaje de ruta', async () => {
	const server = app.listen(0);

	try {
		const response = await request(server, '/api/no-existe');

		assert.equal(response.statusCode, 404);
		assert.match(response.body?.message || '', /\/api\/no-existe/i);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
