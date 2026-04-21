import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import { officeService } from '../src/services/officeService.js';
import officeBlockService from '../src/services/officeBlockService.js';
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
  professionalUserId: '33333333-3333-4333-8333-333333333333',
  professionalId: '44444444-4444-4444-8444-444444444444',
  officeId: '55555555-5555-4555-8555-555555555555',
  blockId: '66666666-6666-4666-8666-666666666666',
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

test('POST /api/offices crea consultorios con professionalId forzado desde la sesion', async () => {
  const server = startTestServer();
  const restores = [];
  let receivedPayload = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(officeService, 'create', async (payload) => {
        receivedPayload = payload;
        return {
          id: IDS.officeId,
          ...payload,
        };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, '/api/offices', {
      method: 'POST',
      jar,
      headers: withCsrf(csrfToken),
      body: {
        professionalId: 'forged-professional-id',
        name: 'Consultorio Central',
        address: 'Av. QA 123',
        phone: '+54 11 5555 1000',
        appointmentDuration: 30,
        schedule: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '13:00',
          },
        ],
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(receivedPayload?.professionalId, IDS.professionalId);
    assert.equal(receivedPayload?.schedule?.length, 1);
    assert.equal(response.body?.data?.id, IDS.officeId);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/offices/:id devuelve un consultorio existente', async () => {
  const server = startTestServer();
  const restores = [];

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(officeService, 'getById', async (officeId) => ({
        id: officeId,
        name: 'Consultorio Central',
      }))
    );

    const response = await requestJson(server, `/api/offices/${IDS.officeId}`, {
      jar: authenticatedJar(),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body?.data?.id, IDS.officeId);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/offices/professional/:professionalId lista los consultorios de un profesional', async () => {
  const server = startTestServer();
  const restores = [];

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(officeService, 'getByProfessional', async (professionalId) => [
        { id: IDS.officeId, professionalId, name: 'Consultorio Central' },
      ])
    );

    const response = await requestJson(
      server,
      `/api/offices/professional/${IDS.professionalId}`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body?.results, 1);
    assert.equal(response.body?.data?.[0]?.professionalId, IDS.professionalId);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('PUT /api/offices/:id valida ownership antes de actualizar', async () => {
  const server = startTestServer();
  const restores = [];
  let updatedPayload = null;
  let ownedOfficeCheck = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async (user, officeId) => {
        ownedOfficeCheck = {
          userProfessionalId: user.professional.id,
          officeId,
        };
        return { id: officeId };
      })
    );
    restores.push(
      stubMethod(officeService, 'update', async (officeId, payload) => {
        updatedPayload = payload;
        return {
          id: officeId,
          ...payload,
        };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, `/api/offices/${IDS.officeId}`, {
      method: 'PUT',
      jar,
      headers: withCsrf(csrfToken),
      body: {
        name: 'Consultorio Norte',
        schedule: [],
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(ownedOfficeCheck, {
      userProfessionalId: IDS.professionalId,
      officeId: IDS.officeId,
    });
    assert.equal(updatedPayload?.name, 'Consultorio Norte');
    assert.deepEqual(updatedPayload?.schedule, []);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('DELETE /api/offices/:id valida ownership y elimina el consultorio', async () => {
  const server = startTestServer();
  const restores = [];
  let deletedOfficeId = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async () => ({ id: IDS.officeId }))
    );
    restores.push(
      stubMethod(officeService, 'delete', async (officeId) => {
        deletedOfficeId = officeId;
        return { success: true };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(server, `/api/offices/${IDS.officeId}`, {
      method: 'DELETE',
      jar,
      headers: withCsrf(csrfToken),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(deletedOfficeId, IDS.officeId);
    assert.match(response.body?.message || '', /consultorio eliminado/i);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('POST /api/offices/:officeId/blocks/day crea bloqueos de dia completo', async () => {
  const server = startTestServer();
  const restores = [];
  let blockPayload = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async () => ({ id: IDS.officeId }))
    );
    restores.push(
      stubMethod(officeBlockService, 'blockDay', async (officeId, payload) => {
        blockPayload = { officeId, payload };
        return {
          block: {
            id: IDS.blockId,
            officeId,
            date: payload.date,
            type: 'full_day',
          },
          cancelledAppointments: 2,
        };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(
      server,
      `/api/offices/${IDS.officeId}/blocks/day`,
      {
        method: 'POST',
        jar,
        headers: withCsrf(csrfToken),
        body: {
          date: '2099-05-01',
          reason: 'Congreso',
          cancelExisting: true,
        },
      }
    );

    assert.equal(response.statusCode, 201);
    assert.equal(blockPayload?.officeId, IDS.officeId);
    assert.equal(blockPayload?.payload?.cancelExisting, true);
    assert.equal(response.body?.cancelledAppointments, 2);
    assert.equal(response.body?.data?.type, 'full_day');
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('POST /api/offices/:officeId/blocks/time-slots crea bloqueos parciales', async () => {
  const server = startTestServer();
  const restores = [];

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async () => ({ id: IDS.officeId }))
    );
    restores.push(
      stubMethod(officeBlockService, 'blockTimeSlots', async (officeId, payload) => ({
        blocks: payload.slots.map((slot, index) => ({
          id: `${IDS.blockId}-${index + 1}`,
          officeId,
          date: payload.date,
          type: 'time_range',
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        cancelledAppointments: 1,
      }))
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(
      server,
      `/api/offices/${IDS.officeId}/blocks/time-slots`,
      {
        method: 'POST',
        jar,
        headers: withCsrf(csrfToken),
        body: {
          date: '2099-05-02',
          slots: [
            { startTime: '09:00', endTime: '09:30' },
            { startTime: '10:00', endTime: '10:30' },
          ],
        },
      }
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body?.cancelledAppointments, 1);
    assert.equal(response.body?.data?.length, 2);
    assert.equal(response.body?.data?.[0]?.type, 'time_range');
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('GET /api/offices/:officeId/blocks devuelve bloqueos del consultorio propio', async () => {
  const server = startTestServer();
  const restores = [];
  let accessMessage = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async (_user, _officeId, message) => {
        accessMessage = message;
        return { id: IDS.officeId };
      })
    );
    restores.push(
      stubMethod(officeBlockService, 'getByOffice', async () => [
        { id: IDS.blockId, officeId: IDS.officeId, date: '2099-05-01' },
      ])
    );

    const response = await requestJson(
      server,
      `/api/offices/${IDS.officeId}/blocks?startDate=2099-05-01&endDate=2099-05-31`,
      {
        jar: authenticatedJar(),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.match(accessMessage || '', /bloqueos de tus propios consultorios/i);
    assert.equal(response.body?.results, 1);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('DELETE /api/offices/:officeId/blocks/:blockId elimina un bloqueo existente', async () => {
  const server = startTestServer();
  const restores = [];
  let deletedBlock = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async () => ({ id: IDS.officeId }))
    );
    restores.push(
      stubMethod(officeBlockService, 'deleteBlock', async (officeId, blockId) => {
        deletedBlock = { officeId, blockId };
        return { success: true };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(
      server,
      `/api/offices/${IDS.officeId}/blocks/${IDS.blockId}`,
      {
        method: 'DELETE',
        jar,
        headers: withCsrf(csrfToken),
      }
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(deletedBlock, {
      officeId: IDS.officeId,
      blockId: IDS.blockId,
    });
    assert.match(response.body?.message || '', /bloqueo eliminado/i);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});

test('POST /api/offices/:officeId/cancel-day cancela turnos del dia en lote', async () => {
  const server = startTestServer();
  const restores = [];
  let cancelPayload = null;

  try {
    stubAuthenticatedUser(restores, { role: 'professional' });
    restores.push(
      stubMethod(accessControlService, 'getOwnedOffice', async () => ({ id: IDS.officeId }))
    );
    restores.push(
      stubMethod(officeBlockService, 'cancelDayAppointments', async (officeId, payload) => {
        cancelPayload = { officeId, payload };
        return { cancelledAppointments: 3 };
      })
    );

    const jar = authenticatedJar();
    const { csrfToken } = await issueCsrfToken(server, jar);
    const response = await requestJson(
      server,
      `/api/offices/${IDS.officeId}/cancel-day`,
      {
        method: 'POST',
        jar,
        headers: withCsrf(csrfToken),
        body: {
          date: '2099-05-05',
          reason: 'Feriado',
        },
      }
    );

    assert.equal(response.statusCode, 200);
    assert.equal(cancelPayload?.officeId, IDS.officeId);
    assert.equal(cancelPayload?.payload?.date, '2099-05-05');
    assert.equal(response.body?.cancelledAppointments, 3);
    assert.match(response.body?.message || '', /3 turno\(s\) cancelado\(s\)/i);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await stopTestServer(server);
  }
});
