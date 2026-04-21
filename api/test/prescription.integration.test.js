import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import prescriptionService from '../src/services/prescriptionService.js';
import prescriptionPdfService from '../src/services/prescriptionPdfService.js';
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
  prescriptionId: '55555555-5555-4555-8555-555555555555',
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
  const resolvedUserId = userId || (role === 'professional' ? IDS.professionalUserId : IDS.patientUserId);
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

test('POST /api/prescriptions crea recetas con professionalId forzado desde la sesion', async () => {
  const server = startTestServer();
  const restores = [];
  let receivedPayload = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(prescriptionService, 'create', async (payload) => {
        receivedPayload = payload;
        return {
          id: IDS.prescriptionId,
          ...payload,
        };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, '/api/prescriptions', {
      method: 'POST',
      jar,
      headers: withCsrf(csrfToken),
      body: {
        patientId: IDS.patientId,
        professionalId: IDS.otherProfessionalId,
        medications: [
          {
            name: 'Levotiroxina 75 mcg',
            dose: '1 comprimido',
            frequency: 'Cada manana',
            duration: '30 dias',
          },
        ],
        diagnosis: 'Hipotiroidismo',
        instructions: 'Tomar en ayunas',
        validUntil: '2099-06-01',
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(receivedPayload?.professionalId, IDS.professionalId);
    assert.equal(receivedPayload?.patientId, IDS.patientId);
    assert.equal(response.body?.data?.id, IDS.prescriptionId);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/prescriptions/:id devuelve una receta y valida acceso de lectura', async () => {
  const server = startTestServer();
  const restores = [];
  let accessChecked = null;

  try {
    stubAuthenticatedUser(restores, { role: 'patient' });
    restores.push(
      stubMethod(prescriptionService, 'getById', async (prescriptionId) => ({
        id: prescriptionId,
        patientId: IDS.patientId,
        professionalId: IDS.professionalId,
      }))
    );
    restores.push(
      stubMethod(accessControlService, 'assertPrescriptionReadAccess', (user, prescription) => {
        accessChecked = {
          role: user.role,
          prescriptionId: prescription.id,
        };
        return true;
      })
    );

    const response = await requestJson(server, `/api/prescriptions/${IDS.prescriptionId}`, {
      jar: authenticatedJar(),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(accessChecked, {
      role: 'patient',
      prescriptionId: IDS.prescriptionId,
    });
    assert.equal(response.body?.data?.id, IDS.prescriptionId);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/prescriptions/:id/download devuelve el PDF con headers correctos', async () => {
  const server = startTestServer();
  const restores = [];
  const pdfBuffer = Buffer.from('%PDF-1.4 qa-prescription');
  let accessMessage = null;

  try {
    stubAuthenticatedUser(restores, { role: 'patient' });
    restores.push(
      stubMethod(prescriptionService, 'getById', async () => ({
        id: IDS.prescriptionId,
        patientId: IDS.patientId,
        professionalId: IDS.professionalId,
        createdAt: '2099-06-10T10:00:00.000Z',
        patient: {
          user: {
            lastName: 'Martinez',
          },
        },
      }))
    );
    restores.push(
      stubMethod(
        accessControlService,
        'assertPrescriptionReadAccess',
        (user, prescription, message) => {
          accessMessage = {
            role: user.role,
            prescriptionId: prescription.id,
            message,
          };
          return true;
        }
      )
    );
    restores.push(
      stubMethod(prescriptionPdfService, 'generate', async (prescriptionId) => {
        assert.equal(prescriptionId, IDS.prescriptionId);
        return pdfBuffer;
      })
    );

    const response = await requestJson(
      server,
      `/api/prescriptions/${IDS.prescriptionId}/download`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.match(
      response.headers['content-disposition'] || '',
      /attachment; filename="receta_Martinez_2099-06-10\.pdf"/
    );
    assert.equal(Number(response.headers['content-length']), pdfBuffer.length);
    assert.equal(response.rawBody, pdfBuffer.toString());
    assert.equal(accessMessage?.message, 'No tenes permiso para descargar esta receta.');
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/prescriptions/patient/:patientId permite al paciente leer sus propias recetas', async () => {
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
      stubMethod(prescriptionService, 'getByPatient', async (_patientId, filters) => {
        filtersReceived = filters;
        return [{ id: IDS.prescriptionId }];
      })
    );

    const response = await requestJson(
      server,
      `/api/prescriptions/patient/${IDS.patientId}?valid=true&search=tirox`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.equal(filtersReceived?.valid, 'true');
    assert.equal(filtersReceived?.search, 'tirox');
    assert.equal(response.body?.results, 1);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/prescriptions/patient/:patientId filtra por professionalId cuando consulta un profesional vinculado', async () => {
  const server = startTestServer();
  const restores = [];
  let professionalAccess = null;
  let filtersReceived = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(
        accessControlService,
        'assertProfessionalCanAccessPatient',
        async (user, patientId, message) => {
          professionalAccess = {
            professionalId: user.professional.id,
            patientId,
            message,
          };
          return IDS.professionalId;
        }
      )
    );
    restores.push(
      stubMethod(prescriptionService, 'getByPatient', async (_patientId, filters) => {
        filtersReceived = filters;
        return [{ id: IDS.prescriptionId, professionalId: filters.professionalId }];
      })
    );

    const response = await requestJson(
      server,
      `/api/prescriptions/patient/${IDS.patientId}?search=control`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(professionalAccess, {
      professionalId: IDS.professionalId,
      patientId: IDS.patientId,
      message: 'No tenes vinculo con este paciente.',
    });
    assert.equal(filtersReceived?.professionalId, IDS.professionalId);
    assert.equal(filtersReceived?.search, 'control');
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/prescriptions/professional/:professionalId bloquea a otro profesional', async () => {
  const server = startTestServer();
  const restores = [];
  let serviceCalled = false;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(prescriptionService, 'getByProfessional', async () => {
        serviceCalled = true;
        return [];
      })
    );

    const response = await requestJson(
      server,
      `/api/prescriptions/professional/${IDS.otherProfessionalId}`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 403);
    assert.equal(serviceCalled, false);
    assert.match(response.body?.message || '', /propias recetas/i);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('PUT /api/prescriptions/:id actualiza la receta cuando el profesional es el emisor', async () => {
  const server = startTestServer();
  const restores = [];
  let updatePayload = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(prescriptionService, 'getById', async () => ({
        id: IDS.prescriptionId,
        professionalId: IDS.professionalId,
      }))
    );
    restores.push(
      stubMethod(prescriptionService, 'update', async (prescriptionId, payload) => {
        updatePayload = { prescriptionId, payload };
        return {
          id: prescriptionId,
          ...payload,
        };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, `/api/prescriptions/${IDS.prescriptionId}`, {
      method: 'PUT',
      jar,
      headers: withCsrf(csrfToken),
      body: {
        diagnosis: 'Hipotiroidismo controlado',
        medications: [
          {
            name: 'Levotiroxina 88 mcg',
            dose: '1 comprimido',
          },
        ],
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(updatePayload?.prescriptionId, IDS.prescriptionId);
    assert.equal(updatePayload?.payload?.diagnosis, 'Hipotiroidismo controlado');
    assert.equal(response.body?.data?.diagnosis, 'Hipotiroidismo controlado');
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('DELETE /api/prescriptions/:id elimina la receta cuando el profesional es el emisor', async () => {
  const server = startTestServer();
  const restores = [];
  let deletedPrescriptionId = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(prescriptionService, 'getById', async () => ({
        id: IDS.prescriptionId,
        professionalId: IDS.professionalId,
      }))
    );
    restores.push(
      stubMethod(prescriptionService, 'delete', async (prescriptionId) => {
        deletedPrescriptionId = prescriptionId;
        return { success: true };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, `/api/prescriptions/${IDS.prescriptionId}`, {
      method: 'DELETE',
      jar,
      headers: withCsrf(csrfToken),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(deletedPrescriptionId, IDS.prescriptionId);
    assert.match(response.body?.message || '', /receta eliminada/i);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});
