import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import appointmentService from '../src/services/appointmentService.js';
import accessControlService from '../src/services/accessControlService.js';
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

function authenticatedJar() {
	const jar = new CookieJar();
	jar.cookies.set('token', 'access-token');
	return jar;
}

test('POST /api/appointments crea turnos de paciente con patientId y createdBy forzados desde sesion', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;

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
			stubMethod(appointmentService, 'create', async (payload) => {
				receivedPayload = payload;

				return {
					id: 'appointment-1',
					...payload,
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, '/api/appointments', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				patientId: 'forged-patient',
				professionalId: 'professional-1',
				officeId: 'office-1',
				date: '2099-01-01',
				time: '09:00',
				reason: 'Chequeo QA',
			},
		});

		assert.equal(response.statusCode, 201);
		assert.equal(receivedPayload?.patientId, 'patient-1');
		assert.equal(receivedPayload?.createdBy, 'patient');
		assert.equal(response.body?.data?.id, 'appointment-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/appointments corta el alta si un profesional no tiene vinculo con el paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let createCalled = false;

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
		restores.push(
			stubMethod(
				accessControlService,
				'assertProfessionalCanAccessPatient',
				async () => {
					throw new ApiError(
						403,
						'No tenes vinculo con este paciente para agendar un turno.'
					);
				}
			)
		);
		restores.push(
			stubMethod(appointmentService, 'create', async () => {
				createCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, '/api/appointments', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				patientId: 'patient-2',
				officeId: 'office-1',
				date: '2099-01-01',
				time: '10:00',
				reason: 'Alta no autorizada',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.equal(createCalled, false);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/appointments/:id bloquea a un usuario ajeno al turno', async () => {
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
			stubMethod(appointmentService, 'getById', async () => ({
				id: 'appointment-9',
				patientId: 'patient-2',
				professionalId: 'professional-3',
			}))
		);

		const response = await requestJson(server, '/api/appointments/appointment-9', {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 403);
		assert.match(response.body?.message || '', /permiso para acceder a este turno/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
