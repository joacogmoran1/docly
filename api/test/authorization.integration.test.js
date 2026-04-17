import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import patientService from '../src/services/patientService.js';
import professionalService from '../src/services/professionalService.js';
import { User } from '../src/database/models/index.js';
import {
	CookieJar,
	requestJson,
	startTestServer,
	stopTestServer,
} from '../test-support/httpTestClient.js';
import { stubMethod } from '../test-support/stub.js';

function authenticatedJar() {
	const jar = new CookieJar();
	jar.cookies.set('token', 'access-token');
	return jar;
}

test('GET /api/appointments/patient/:id bloquea a un paciente que intenta leer turnos ajenos', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-patient-1', type: 'access' })));
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: 'user-patient-1',
				role: 'patient',
				isActive: true,
				patient: { id: 'patient-1' },
				professional: null,
			}))
		);

		const response = await requestJson(server, '/api/appointments/patient/patient-2', {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 403);
		assert.match(response.body?.message || '', /propios turnos/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/patients/search exige rol profesional y no expone la busqueda a pacientes', async () => {
	const server = startTestServer();
	const restores = [];
	let searchCalled = false;

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-patient-1', type: 'access' })));
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: 'user-patient-1',
				role: 'patient',
				isActive: true,
				patient: { id: 'patient-1' },
				professional: null,
			}))
		);
		restores.push(
			stubMethod(patientService, 'search', async () => {
				searchCalled = true;
				return [];
			})
		);

		const response = await requestJson(server, '/api/patients/search?q=garcia', {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 403);
		assert.equal(searchCalled, false);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:professionalId/patients solo permite al profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-professional-1', type: 'access' })));
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: 'user-professional-1',
				role: 'professional',
				isActive: true,
				patient: null,
				professional: { id: 'professional-1' },
			}))
		);

		const response = await requestJson(
			server,
			'/api/professionals/professional-2/patients',
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 403);
		assert.match(response.body?.message || '', /tus propios pacientes/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/patients/:id permite al paciente leer su propio perfil', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-patient-1', type: 'access' })));
		restores.push(
			stubMethod(User, 'findByPk', async () => ({
				id: 'user-patient-1',
				role: 'patient',
				isActive: true,
				patient: { id: 'patient-1' },
				professional: null,
			}))
		);
		restores.push(
			stubMethod(patientService, 'getProfile', async (patientId) => ({
				id: patientId,
				name: 'Paciente QA',
			}))
		);
		restores.push(
			stubMethod(professionalService, 'getProfessionalPatients', async () => {
				throw new Error('No deberia ejecutarse en esta prueba');
			})
		);

		const response = await requestJson(server, '/api/patients/patient-1', {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.data?.id, 'patient-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
