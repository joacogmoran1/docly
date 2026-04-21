import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import medicalRecordService from '../src/services/medicalRecordService.js';
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
	recordId: '55555555-5555-4555-8555-555555555555',
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

test('GET /api/medical-records/:id devuelve un registro y valida acceso de lectura', async () => {
	const server = startTestServer();
	const restores = [];
	let accessChecked = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(medicalRecordService, 'getById', async (recordId) => ({
				id: recordId,
				patientId: IDS.patientId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(accessControlService, 'assertMedicalRecordReadAccess', (user, record) => {
				accessChecked = {
					role: user.role,
					recordId: record.id,
				};
				return true;
			})
		);

		const response = await requestJson(server, `/api/medical-records/${IDS.recordId}`, {
			jar: authenticatedJar(),
		});

		assert.equal(response.statusCode, 200);
		assert.deepEqual(accessChecked, {
			role: 'patient',
			recordId: IDS.recordId,
		});
		assert.equal(response.body?.data?.id, IDS.recordId);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/medical-records/patient/:patientId permite al paciente leer sus propios registros', async () => {
	const server = startTestServer();
	const restores = [];
	let filtersReceived = null;

	try {
		stubAuthenticatedUser(restores, { role: 'patient' });
		restores.push(
			stubMethod(accessControlService, 'assertPatientSelf', (user, patientId) => {
				assert.equal(user.patient.id, IDS.patientId);
				assert.equal(patientId, IDS.patientId);
				return IDS.patientId;
			})
		);
		restores.push(
			stubMethod(medicalRecordService, 'getByPatient', async (_patientId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.recordId }];
			})
		);

		const response = await requestJson(
			server,
			`/api/medical-records/patient/${IDS.patientId}?search=asma&startDate=2099-01-01`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(filtersReceived?.search, 'asma');
		assert.equal(filtersReceived?.startDate, '2099-01-01');
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/medical-records/patient/:patientId filtra por professionalId cuando consulta un profesional vinculado', async () => {
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
			stubMethod(medicalRecordService, 'getByPatient', async (_patientId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.recordId, professionalId: filters.professionalId }];
			})
		);

		const response = await requestJson(
			server,
			`/api/medical-records/patient/${IDS.patientId}?endDate=2099-12-31`,
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
		assert.equal(filtersReceived?.professionalId, IDS.professionalId);
		assert.equal(filtersReceived?.endDate, '2099-12-31');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/medical-records/professional/:professionalId bloquea a otro profesional', async () => {
	const server = startTestServer();
	const restores = [];
	let serviceCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getByProfessional', async () => {
				serviceCalled = true;
				return [];
			})
		);

		const response = await requestJson(
			server,
			`/api/medical-records/professional/${IDS.otherProfessionalId}`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 403);
		assert.equal(serviceCalled, false);
		assert.match(response.body?.message || '', /propios registros medicos/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('GET /api/medical-records/professional/:professionalId devuelve los registros del profesional autenticado', async () => {
	const server = startTestServer();
	const restores = [];
	let filtersReceived = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getByProfessional', async (_professionalId, filters) => {
				filtersReceived = filters;
				return [{ id: IDS.recordId }];
			})
		);

		const response = await requestJson(
			server,
			`/api/medical-records/professional/${IDS.professionalId}?patientId=${IDS.patientId}&date=2099-02-10`,
			{
				jar: authenticatedJar(),
			}
		);

		assert.equal(response.statusCode, 200);
		assert.equal(filtersReceived?.patientId, IDS.patientId);
		assert.equal(filtersReceived?.date, '2099-02-10');
		assert.equal(response.body?.results, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/medical-records/:id actualiza el registro cuando el profesional es el autor', async () => {
	const server = startTestServer();
	const restores = [];
	let updatePayload = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getById', async () => ({
				id: IDS.recordId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(medicalRecordService, 'update', async (recordId, payload) => {
				updatePayload = { recordId, payload };
				return {
					id: recordId,
					...payload,
				};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/medical-records/${IDS.recordId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				reason: 'Control actualizado',
				diagnosis: 'Asma estable',
				indications: 'Continuar tratamiento',
				evolution: 'Sin cambios',
				nextCheckup: '1_month',
				vitalSigns: { bloodPressure: '120/80' },
			},
		});

		assert.equal(response.statusCode, 200);
		assert.equal(updatePayload?.recordId, IDS.recordId);
		assert.equal(updatePayload?.payload?.diagnosis, 'Asma estable');
		assert.equal(response.body?.data?.diagnosis, 'Asma estable');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('PUT /api/medical-records/:id bloquea a otro profesional sobre un registro ajeno', async () => {
	const server = startTestServer();
	const restores = [];
	let updateCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getById', async () => ({
				id: IDS.recordId,
				professionalId: IDS.otherProfessionalId,
			}))
		);
		restores.push(
			stubMethod(medicalRecordService, 'update', async () => {
				updateCalled = true;
				return {};
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/medical-records/${IDS.recordId}`, {
			method: 'PUT',
			jar,
			headers: withCsrf(csrfToken),
			body: {
				reason: 'Control actualizado',
			},
		});

		assert.equal(response.statusCode, 403);
		assert.equal(updateCalled, false);
		assert.match(response.body?.message || '', /creo este registro puede modificarlo/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/medical-records/:id elimina el registro cuando el profesional es el autor', async () => {
	const server = startTestServer();
	const restores = [];
	let deletedRecordId = null;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getById', async () => ({
				id: IDS.recordId,
				professionalId: IDS.professionalId,
			}))
		);
		restores.push(
			stubMethod(medicalRecordService, 'delete', async (recordId) => {
				deletedRecordId = recordId;
				return { success: true };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/medical-records/${IDS.recordId}`, {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 200);
		assert.equal(deletedRecordId, IDS.recordId);
		assert.match(response.body?.message || '', /registro medico eliminado/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});

test('DELETE /api/medical-records/:id bloquea a otro profesional sobre un registro ajeno', async () => {
	const server = startTestServer();
	const restores = [];
	let deleteCalled = false;

	try {
		stubAuthenticatedUser(restores, { role: 'professional' });
		restores.push(
			stubMethod(medicalRecordService, 'getById', async () => ({
				id: IDS.recordId,
				professionalId: IDS.otherProfessionalId,
			}))
		);
		restores.push(
			stubMethod(medicalRecordService, 'delete', async () => {
				deleteCalled = true;
				return { success: true };
			})
		);

		const jar = authenticatedJar();
		const { csrfToken } = await issueCsrfToken(server, jar);
		const response = await requestJson(server, `/api/medical-records/${IDS.recordId}`, {
			method: 'DELETE',
			jar,
			headers: withCsrf(csrfToken),
		});

		assert.equal(response.statusCode, 403);
		assert.equal(deleteCalled, false);
		assert.match(response.body?.message || '', /creo este registro puede eliminarlo/i);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
		await stopTestServer(server);
	}
});
