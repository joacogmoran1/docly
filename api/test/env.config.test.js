import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const envModuleUrl = pathToFileURL(path.resolve('src/config/env.js')).href;
const managedKeys = ['NODE_ENV', 'JWT_SECRET', 'JWT_SECRET_FILE'];

async function loadEnvWith(overrides) {
	const previousEnv = {};

	for (const key of managedKeys) {
		previousEnv[key] = process.env[key];
		delete process.env[key];
	}

	Object.assign(process.env, overrides);

	try {
		return await import(`${envModuleUrl}?test=${Date.now()}-${Math.random()}`);
	} finally {
		for (const key of managedKeys) {
			if (previousEnv[key] === undefined) {
				delete process.env[key];
				continue;
			}

			process.env[key] = previousEnv[key];
		}
	}
}

test('env permite cargar secretos desde *_FILE', async () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docly-env-'));
	const secretPath = path.join(tempDir, 'jwt-secret');
	fs.writeFileSync(secretPath, 'secret-from-file\n', 'utf8');

	try {
		const { default: env } = await loadEnvWith({
			NODE_ENV: 'development',
			JWT_SECRET: '',
			JWT_SECRET_FILE: secretPath,
		});

		assert.equal(env.auth.jwtSecret, 'secret-from-file');
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test('env prioriza el valor directo sobre *_FILE cuando ambos existen', async () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docly-env-'));
	const secretPath = path.join(tempDir, 'jwt-secret');
	fs.writeFileSync(secretPath, 'secret-from-file\n', 'utf8');

	try {
		const { default: env } = await loadEnvWith({
			NODE_ENV: 'development',
			JWT_SECRET: 'direct-secret',
			JWT_SECRET_FILE: secretPath,
		});

		assert.equal(env.auth.jwtSecret, 'direct-secret');
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});
