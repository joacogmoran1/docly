import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import patientService from '../src/services/patientService.js';
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

const IDS = {
	patientUserId: '11111111-1111-4111-8111-111111111111',
	patientId: '22222222-2222-4222-8222-222222222222',
	otherPatientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	professionalUserId: '33333333-3333-4333-8333-333333333333',
	professionalId: '44444444-4444-4444-8444-444444444444',
};

function authenticatedJar() {
	const jar = new CookieJar();
	jar.cookies.set('token', 'access-token');
	return jar;
}

function stubAuthenticatedUser(
	restores,
	{ role = 'patient', userId, patientId = null, professionalId = null } = {}
) {
	const resolvedUserId =
		userId || (role === 'professional' ? IDS.professionalUserId : IDS.patientUserId);
	const resolvedPatientId = patientId || (role === 'patient' ? IDS.patientId : null);
	const resolvedProfessionalId =
		professionalId || (role === 'professional' ? IDS.professionalId : null);

	restores.push(stubMethod(jwt, 'verify', () => ({ id: resolvedUserId, type: 'access' })));
	restores.push(
		stubMethod(User, 'findByPk', async () => ({
			id: resolvedUserId,
			role,
			isActive: true,
			patient: resolvedPatientId ? { id: resolvedPatientId } : null,
			professional: resolvedProfessionalId ? { id: resolvedProfessionalId } : null,
		}))
	);
}

test('PUT /api/patients/:id actualiza el perfil cuando el paciente edita sus propios datos', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(patientService, 'updateProfile', async (patientId, payload) => {
				updatePayload = { patientId, payload };
				return {
					id: patientId,
					dni: payload.dni,
					medicalCoverage: payload.medicalCoverage,
					user: {
						name: payload.name,
						lastName: payload.lastName,
						phone: payload.phone,
					},
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/patients/${IDS.patientId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				dni: '30111222',
				medicalCoverage: 'OSDE',
				coverageNumber: '123456',
				name: 'Ana',
				lastName: 'Paciente',
				phone: '+5491112345678',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.patientId, IDS.patientId);
		assert.equal(updatePayload?.payload?.dni, '30111222');
		assert.equal(updatePayload?.payload?.name, 'Ana');
		assert.equal(response.body?.data?.user?.phone, '+5491112345678');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/patients/:id bloquea a un paciente que intenta editar otro perfil', async () => {
	const server = startTestServer();
	const restores = [];
	let updateCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(patientService, 'updateProfile', async () => {
				updateCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/patients/${IDS.otherPatientId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				dni: '30111222',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.equal(updateCalled, false);
		assert.match(response.body?.message || '', /modificar tu propio perfil/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/patients/:id/health devuelve la informacion de salud del propio paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let accessChecked = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(
				accessControlService,
				'assertPatientOrLinkedProfessional',
				async (user, patientId, patientMessage, professionalMessage) => {
					accessChecked = {
						role: user.role,
						patientId,
						patientMessage,
						professionalMessage,
					};
					return { role: 'patient', patientId };
				}
			)
		);
		restores.push(
			stubMethod(patientService, 'getHealthInfo', async patientId => ({
				patientId,
				diseases: 'Asma',
				allergies: 'Penicilina',
				medications: 'Salbutamol',
			}))
		);

		const response = await requestJson(server, `/api/patients/${IDS.patientId}/health`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(accessChecked, {
			role: 'patient',
			patientId: IDS.patientId,
			patientMessage: 'Solo podés ver tu propia información de salud.',
			professionalMessage: 'No tenés vínculo con este paciente.',
		});
		assert.equal(response.body?.data?.allergies, 'Penicilina');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/patients/:id/health permite a un profesional vinculado leer la informacion de salud', async () => {
	const server = startTestServer();
	const restores = [];
	let accessChecked = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(
				accessControlService,
				'assertPatientOrLinkedProfessional',
				async (user, patientId, patientMessage, professionalMessage) => {
					accessChecked = {
						role: user.role,
						professionalId: user.professional.id,
						patientId,
						patientMessage,
						professionalMessage,
					};
					return { role: 'professional', professionalId: IDS.professionalId };
				}
			)
		);
		restores.push(
			stubMethod(patientService, 'getHealthInfo', async patientId => ({
				patientId,
				diseases: 'Hipertension',
				allergies: 'Ninguna',
				medications: 'Losartan',
			}))
		);

		const response = await requestJson(server, `/api/patients/${IDS.patientId}/health`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(accessChecked, {
			role: 'professional',
			professionalId: IDS.professionalId,
			patientId: IDS.patientId,
			patientMessage: 'Solo podés ver tu propia información de salud.',
			professionalMessage: 'No tenés vínculo con este paciente.',
		});
		assert.equal(response.body?.data?.medications, 'Losartan');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/patients/:id/health actualiza la informacion de salud del propio paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(patientService, 'updateHealthInfo', async (patientId, payload) => {
				updatePayload = { patientId, payload };
				return {
					patientId,
					...payload,
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/patients/${IDS.patientId}/health`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				diseases: 'Asma',
				allergies: 'Penicilina',
				medications: 'Salbutamol',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.patientId, IDS.patientId);
		assert.equal(updatePayload?.payload?.diseases, 'Asma');
		assert.equal(response.body?.data?.medications, 'Salbutamol');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/patients/:id/health bloquea a un paciente que intenta editar la informacion de salud ajena', async () => {
	const server = startTestServer();
	const restores = [];
	let updateCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(patientService, 'updateHealthInfo', async () => {
				updateCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/patients/${IDS.otherPatientId}/health`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				allergies: 'Latex',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.equal(updateCalled, false);
		assert.match(response.body?.message || '', /modificar tu propia información de salud/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
