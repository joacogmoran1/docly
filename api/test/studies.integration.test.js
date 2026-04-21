import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

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

const IDS = {
	patientUserId: '11111111-1111-4111-8111-111111111111',
	patientId: '22222222-2222-4222-8222-222222222222',
	otherPatientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
	professionalUserId: '33333333-3333-4333-8333-333333333333',
	professionalId: '44444444-4444-4444-8444-444444444444',
	otherProfessionalId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
	studyId: '55555555-5555-4555-8555-555555555555',
};

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

test('GET /api/studies/:id permite leer un estudio subido por paciente a un profesional vinculado', async () => {
	const server = startTestServer();
	const restores = [];
	let linkCheck = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async studyId => ({
				id: studyId,
				patientId: IDS.patientId,
				professionalId: null,
			}))
		);
		restores.push(
			stubMethod(
				accessControlService,
				'hasPatientProfessionalLink',
				async (professionalId, patientId) => {
					linkCheck = { professionalId, patientId };
					return true;
				}
			)
		);

		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(linkCheck, {
			professionalId: IDS.professionalId,
			patientId: IDS.patientId,
		});
		assert.equal(response.body?.data?.id, IDS.studyId);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/:id bloquea a un profesional sin vinculo sobre un estudio subido por paciente', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async studyId => ({
				id: studyId,
				patientId: IDS.patientId,
				professionalId: null,
			}))
		);
		restores.push(
			stubMethod(accessControlService, 'hasPatientProfessionalLink', async () => false)
		);

		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 403);
		assert.match(response.body?.message || '', /acceder a este estudio/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/:id permite al profesional autor leer un estudio emitido por profesional', async () => {
	const server = startTestServer();
	const restores = [];

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async studyId => ({
				id: studyId,
				patientId: IDS.patientId,
				professionalId: IDS.professionalId,
			}))
		);

		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(response.body?.data?.professionalId, IDS.professionalId);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/patient/:patientId permite al paciente listar sus propios estudios', async () => {
	const server = startTestServer();
	const restores = [];
	let filtersReceived = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(studyService, 'getByPatient', async (_patientId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.studyId }];
			})
		);

		const response = await requestJson(
			server,
			`/api/studies/patient/${IDS.patientId}?type=Radiografia&endDate=2099-12-31`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(filtersReceived?.type, 'Radiografia');
		assert.equal(filtersReceived?.endDate, '2099-12-31');
		assert.equal(filtersReceived?.viewerProfessionalId, undefined);
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/patient/:patientId agrega viewerProfessionalId cuando consulta un profesional vinculado', async () => {
	const server = startTestServer();
	const restores = [];
	let accessCheck = null;
	let filtersReceived = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(
				accessControlService,
				'assertProfessionalCanAccessPatient',
				async (user, patientId, message) => {
					accessCheck = {
						professionalId: user.professional.id,
						patientId,
						message,
					};
					return IDS.professionalId;
				}
			)
		);
		restores.push(
			stubMethod(studyService, 'getByPatient', async (_patientId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.studyId, professionalId: null }];
			})
		);

		const response = await requestJson(
			server,
			`/api/studies/patient/${IDS.patientId}?type=Laboratorio&startDate=2099-01-01`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.deepEqual(accessCheck, {
			professionalId: IDS.professionalId,
			patientId: IDS.patientId,
			message: 'No tenes vinculo con este paciente.',
		});
		assert.equal(filtersReceived?.viewerProfessionalId, IDS.professionalId);
		assert.equal(filtersReceived?.type, 'Laboratorio');
		assert.equal(filtersReceived?.startDate, '2099-01-01');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/professional/:professionalId devuelve los estudios del profesional autenticado', async () => {
	const server = startTestServer();
	const restores = [];
	let filtersReceived = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getByProfessional', async (_professionalId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.studyId }];
			})
		);

		const response = await requestJson(
			server,
			`/api/studies/professional/${IDS.professionalId}?patientId=${IDS.patientId}`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(filtersReceived?.patientId, IDS.patientId);
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/studies/professional/:professionalId bloquea a otro profesional', async () => {
	const server = startTestServer();
	const restores = [];
	let serviceCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getByProfessional', async () => {
				serviceCalled = true;
				return [];
			})
		);

		const response = await requestJson(
			server,
			`/api/studies/professional/${IDS.otherProfessionalId}`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 403);
		assert.equal(serviceCalled, false);
		assert.match(response.body?.message || '', /propios estudios/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/studies/:id actualiza un estudio subido por paciente cuando edita el paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: null,
			}))
		);
		restores.push(
			stubMethod(studyService, 'update', async (studyId, payload) => {
				updatePayload = { studyId, payload };
				return {
					id: studyId,
					patientId: IDS.patientId,
					professionalId: null,
					...payload,
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				type: 'Radiografia de torax',
				results: 'https://example.com/resultados.pdf',
				notes: 'Subido por paciente',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.studyId, IDS.studyId);
		assert.equal(updatePayload?.payload?.type, 'Radiografia de torax');
		assert.equal(response.body?.data?.notes, 'Subido por paciente');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/studies/:id bloquea al paciente sobre un estudio emitido por profesional', async () => {
	const server = startTestServer();
	const restores = [];
	let updateCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(studyService, 'update', async () => {
				updateCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				notes: 'Intento no permitido',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.equal(updateCalled, false);
		assert.match(response.body?.message || '', /modificar este estudio/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/studies/:id actualiza un estudio emitido por profesional cuando edita el autor', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(studyService, 'update', async (studyId, payload) => {
				updatePayload = { studyId, payload };
				return {
					id: studyId,
					patientId: IDS.patientId,
					professionalId: IDS.professionalId,
					...payload,
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				fileUrl: 'https://example.com/studies/rx-control.jpg',
				notes: 'Actualizado por profesional',
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.studyId, IDS.studyId);
		assert.equal(updatePayload?.payload?.fileUrl, 'https://example.com/studies/rx-control.jpg');
		assert.equal(response.body?.data?.notes, 'Actualizado por profesional');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/studies/:id elimina un estudio subido por paciente cuando lo borra el propio paciente', async () => {
	const server = startTestServer();
	const restores = [];
	let deletedStudyId = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: null,
			}))
		);
		restores.push(
			stubMethod(studyService, 'delete', async studyId => {
				deletedStudyId = studyId;
				return { success: true };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(deletedStudyId, IDS.studyId);
		assert.match(response.body?.message || '', /estudio eliminado/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/studies/:id elimina un estudio emitido por profesional cuando lo borra el autor', async () => {
	const server = startTestServer();
	const restores = [];
	let deletedStudyId = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(studyService, 'delete', async studyId => {
				deletedStudyId = studyId;
				return { success: true };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(deletedStudyId, IDS.studyId);
		assert.match(response.body?.message || '', /estudio eliminado/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/studies/:id bloquea a otro profesional sobre un estudio ajeno', async () => {
	const server = startTestServer();
	const restores = [];
	let deleteCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(studyService, 'getById', async () => ({
				id: IDS.studyId,
				patientId: IDS.patientId,
				professionalId: IDS.otherProfessionalId,
			}))
		);
		restores.push(
			stubMethod(studyService, 'delete', async () => {
				deleteCalled = true;
				return { success: true };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/studies/${IDS.studyId}`, {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 403);
		assert.equal(deleteCalled, false);
		assert.match(response.body?.message || '', /eliminar este estudio/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
