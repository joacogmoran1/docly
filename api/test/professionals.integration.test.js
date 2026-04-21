import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import professionalService from '../src/services/professionalService.js';
import accessControlService from '../src/services/accessControlService.js';
import { Professional, User } from '../src/database/models/index.js';
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
	otherProfessionalId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const VALID_SIGNATURE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9pou1mQAAAAASUVORK5CYII=';

function authenticatedJar() {
	const jar = new CookieJar();
	jar.cookies.set('token', 'access-token');
	return jar;
}

function stubAuthenticatedUser(
	restores,
	{ role = 'professional', userId, patientId = null, professionalId = null } = {}
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

test('GET /api/professionals/search busca profesionales con filtros', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedFilters = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(professionalService, 'search', async (query, filters) => {
				receivedFilters = { query, filters };
				return [{ id: IDS.professionalId }];
			})
		);

		const response = await requestJson(
			server,
			'/api/professionals/search?q=cardio&specialty=Cardiologia&coverage=OSDE',
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(receivedFilters, {
			query: 'cardio',
			filters: {
				specialty: 'Cardiologia',
				coverage: 'OSDE',
			},
		});
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:id devuelve el profesional solicitado', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(professionalService, 'getById', async professionalId => ({
				id: professionalId,
				specialty: 'Cardiologia',
			}))
		);

		const response = await requestJson(server, `/api/professionals/${IDS.professionalId}`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.data?.id, IDS.professionalId);
		assert.equal(response.body?.data?.specialty, 'Cardiologia');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/professionals/:id actualiza el perfil cuando edita el profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(professionalService, 'updateProfile', async (professionalId, payload) => {
				updatePayload = { professionalId, payload };
				return {
					id: professionalId,
					specialty: payload.specialty,
					fees: payload.fees,
					user: {
						name: payload.name,
						lastName: payload.lastName,
					},
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/professionals/${IDS.professionalId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				specialty: 'Clinica Medica',
				fees: { consultation: 25000 },
				name: 'Lucia',
				lastName: 'Medica',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.professionalId, IDS.professionalId);
		assert.equal(updatePayload?.payload?.specialty, 'Clinica Medica');
		assert.equal(response.body?.data?.user?.name, 'Lucia');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/professionals/:id bloquea a otro profesional sobre un perfil ajeno', async () => {
	const server = startTestServer();
	const restores = [];
	let updateCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(professionalService, 'updateProfile', async () => {
				updateCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/professionals/${IDS.otherProfessionalId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				specialty: 'Dermatologia',
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

test('GET /api/professionals/:id/signature devuelve la firma del profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(Professional, 'findByPk', async () => ({
				id: IDS.professionalId,
				signature: VALID_SIGNATURE,
			}))
		);

		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/signature`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.data?.hasSignature, true);
		assert.equal(response.body?.data?.signature, VALID_SIGNATURE);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/professionals/:id/signature carga la firma del profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];
	let updatedSignature = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(Professional, 'findByPk', async () => ({
				id: IDS.professionalId,
				update: async ({ signature }) => {
					updatedSignature = signature;
				},
			}))
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/signature`,
			{
				method: 'PUT',
				jar,
				headers: withCsrf(csrfToken),
				body: { signature: VALID_SIGNATURE },
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(updatedSignature, VALID_SIGNATURE);
		assert.equal(response.body?.data?.hasSignature, true);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/professionals/:id/signature elimina la firma del profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];
	let updatedSignature = 'sentinel';

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(Professional, 'findByPk', async () => ({
				id: IDS.professionalId,
				update: async ({ signature }) => {
					updatedSignature = signature;
				},
			}))
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/signature`,
			{
				method: 'DELETE',
				jar,
				headers: withCsrf(csrfToken),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(updatedSignature, null);
		assert.equal(response.body?.data?.hasSignature, false);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:professionalId/availability incluye datos sensibles para el profesional dueno', async () => {
	const server = startTestServer();
	const restores = [];
	let serviceArgs = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(
				professionalService,
				'getProfessionalAvailability',
				async (professionalId, startDate, endDate, options) => {
					serviceArgs = { professionalId, startDate, endDate, options };
					return { offices: [], appointments: [], blocks: [] };
				}
			)
		);

		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/availability?startDate=2099-01-01&endDate=2099-01-07`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(serviceArgs, {
			professionalId: IDS.professionalId,
			startDate: '2099-01-01',
			endDate: '2099-01-07',
			options: { includeSensitive: true },
		});
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:professionalId/availability no incluye datos sensibles para un paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let serviceArgs = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(
				professionalService,
				'getProfessionalAvailability',
				async (professionalId, startDate, endDate, options) => {
					serviceArgs = { professionalId, startDate, endDate, options };
					return { offices: [], appointments: [], blocks: [] };
				}
			)
		);

		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/availability?startDate=2099-02-01`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(serviceArgs, {
			professionalId: IDS.professionalId,
			startDate: '2099-02-01',
			endDate: undefined,
			options: { includeSensitive: false },
		});
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:professionalId/patients devuelve los pacientes del profesional autenticado', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(professionalService, 'getProfessionalPatients', async professionalId => [
				{
					id: IDS.patientId,
					professionalId,
				},
			])
		);

		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/patients`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.results, 1);
		assert.equal(response.body?.data?.[0]?.id, IDS.patientId);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/:professionalId/patients/:patientId devuelve el detalle del paciente del profesional', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(
				professionalService,
				'getProfessionalPatient',
				async (professionalId, patientId) => ({
					id: patientId,
					medicalRecords: [],
					studies: [{ id: 'study-1' }],
					professionalId,
				})
			)
		);

		const response = await requestJson(
			server,
			`/api/professionals/${IDS.professionalId}/patients/${IDS.patientId}`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.data?.id, IDS.patientId);
		assert.equal(response.body?.data?.studies?.length, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('POST /api/professionals/patients/:patientId/professionals/:professionalId agrega un profesional al equipo del paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedIds = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(
				professionalService,
				'addToPatientTeam',
				async (patientId, professionalId) => {
					receivedIds = { patientId, professionalId };
					return { success: true };
				}
			)
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(
			server,
			`/api/professionals/patients/${IDS.patientId}/professionals/${IDS.professionalId}`,
			{
				method: 'POST',
				jar,
				headers: withCsrf(csrfToken),
			}
		);

		assert.equal(response.statusCode, 201);
		assert.deepEqual(receivedIds, {
			patientId: IDS.patientId,
			professionalId: IDS.professionalId,
		});
		assert.match(response.body?.message || '', /agregado al equipo/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/professionals/patients/:patientId/professionals/:professionalId remueve un profesional del equipo del paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let receivedIds = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(
				professionalService,
				'removeFromPatientTeam',
				async (patientId, professionalId) => {
					receivedIds = { patientId, professionalId };
					return { success: true };
				}
			)
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(
			server,
			`/api/professionals/patients/${IDS.patientId}/professionals/${IDS.professionalId}`,
			{
				method: 'DELETE',
				jar,
				headers: withCsrf(csrfToken),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(receivedIds, {
			patientId: IDS.patientId,
			professionalId: IDS.professionalId,
		});
		assert.match(response.body?.message || '', /removido del equipo/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/professionals/patients/:patientId/professionals permite a un profesional vinculado ver el equipo medico', async () => {
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
			stubMethod(professionalService, 'getPatientProfessionals', async patientId => [
				{ id: IDS.professionalId, patientId },
			])
		);

		const response = await requestJson(
			server,
			`/api/professionals/patients/${IDS.patientId}/professionals`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(accessChecked, {
			role: 'professional',
			professionalId: IDS.professionalId,
			patientId: IDS.patientId,
			patientMessage: 'Solo podés ver tu propio equipo médico.',
			professionalMessage: 'No tenés permiso para ver el equipo médico de este paciente.',
		});
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
