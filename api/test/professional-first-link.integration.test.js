import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import medicalRecordService from '../src/services/medicalRecordService.js';
import studyService from '../src/services/studyService.js';
import accessControlService from '../src/services/accessControlService.js';
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

function professionalSession() {
	return {
		id: 'user-professional-1',
		role: 'professional',
		isActive: true,
		patient: null,
		professional: { id: 'professional-1' },
	};
}

test('POST /api/studies permite cargar un estudio profesional como primer vinculo', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;
	let accessCheckCalled = false;

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-professional-1', type: 'access' })));
		restores.push(stubMethod(User, 'findByPk', async () => professionalSession()));
		restores.push(
			stubMethod(accessControlService, 'assertProfessionalCanAccessPatient', async () => {
				accessCheckCalled = true;
			})
		);
		restores.push(
			stubMethod(studyService, 'create', async payload => {
				receivedPayload = payload;
				return { id: 'study-1', ...payload };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, '/api/studies', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				patientId: 'patient-2',
				type: 'Radiografia',
				date: '2099-01-02',
				results: 'https://example.com/report.pdf',
			},
		});

		assert.equal(response.statusCode, 201);
		assert.equal(accessCheckCalled, false);
		assert.equal(receivedPayload?.patientId, 'patient-2');
		assert.equal(receivedPayload?.professionalId, 'professional-1');
		assert.equal(response.body?.data?.id, 'study-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/medical-records permite crear un registro profesional como primer vinculo', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedPayload = null;
	let accessCheckCalled = false;

	try {
		restores.push(stubMethod(jwt, 'verify', () => ({ id: 'user-professional-1', type: 'access' })));
		restores.push(stubMethod(User, 'findByPk', async () => professionalSession()));
		restores.push(
			stubMethod(accessControlService, 'assertProfessionalCanAccessPatient', async () => {
				accessCheckCalled = true;
			})
		);
		restores.push(
			stubMethod(medicalRecordService, 'create', async payload => {
				receivedPayload = payload;
				return { id: 'record-1', ...payload };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, '/api/medical-records', {
			method: 'POST',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				patientId: '550e8400-e29b-41d4-a716-446655440002',
				date: '2099-01-03',
				reason: 'Control general',
				diagnosis: 'Paciente estable',
				indications: 'Continuar seguimiento',
			},
		});

		assert.equal(response.statusCode, 201);
		assert.equal(accessCheckCalled, false);
		assert.equal(receivedPayload?.patientId, '550e8400-e29b-41d4-a716-446655440002');
		assert.equal(receivedPayload?.professionalId, 'professional-1');
		assert.equal(response.body?.data?.id, 'record-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
