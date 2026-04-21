import test from 'node:test';
import assert from 'node:assert/strict';

import appointmentService from '../src/services/appointmentService.js';
import sequelize from '../src/config/database.js';
import officeBlockService from '../src/services/officeBlockService.js';
import { Appointment, Office, PatientProfessional } from '../src/database/models/index.js';
import ApiError from '../src/utils/ApiError.js';
import { stubMethod } from '../test-support/stub.js';

function formatDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createTransaction(label = 'tx') {
	return {
		label,
		finished: false,
		LOCK: { UPDATE: 'UPDATE' },
		async commit() {
			this.finished = 'commit';
		},
		async rollback() {
			this.finished = 'rollback';
		},
	};
}

function createFutureDate(days = 1) {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
}

function baseAppointmentData(overrides = {}) {
	return {
		patientId: 'patient-1',
		professionalId: 'professional-1',
		officeId: 'office-1',
		date: createFutureDate(),
		time: '10:00',
		duration: 30,
		reason: 'Chequeo QA',
		createdBy: 'patient',
		...overrides,
	};
}

function stubCreateHappyPath(restores, { transaction, officeOverrides = {}, getByIdResult } = {}) {
	const tx = transaction || createTransaction();
	let createPayload = null;
	let findOrCreatePayload = null;

	restores.push(stubMethod(sequelize, 'transaction', async () => tx));
	restores.push(stubMethod(sequelize, 'query', async () => []));
	restores.push(
		stubMethod(Office, 'findByPk', async () => ({
			id: 'office-1',
			professionalId: 'professional-1',
			appointmentDuration: 30,
			...officeOverrides,
		}))
	);
	restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => true));
	restores.push(stubMethod(officeBlockService, 'isBlocked', async () => false));
	restores.push(stubMethod(appointmentService, '_hasTimeConflict', async () => false));
	restores.push(
		stubMethod(Appointment, 'create', async (payload) => {
			createPayload = payload;
			return { id: 'appointment-created' };
		})
	);
	restores.push(
		stubMethod(PatientProfessional, 'findOrCreate', async (payload) => {
			findOrCreatePayload = payload;
			return [{}, true];
		})
	);
	restores.push(
		stubMethod(appointmentService, 'getById', async (appointmentId) => (
			getByIdResult || { id: appointmentId, status: 'confirmed' }
		))
	);

	return {
		tx,
		getCreatePayload: () => createPayload,
		getFindOrCreatePayload: () => findOrCreatePayload,
	};
}

test('AppointmentService.create rechaza un consultorio ajeno al profesional indicado', async () => {
	const restores = [];
	const tx = createTransaction();

	try {
		restores.push(stubMethod(sequelize, 'transaction', async () => tx));
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-2',
				appointmentDuration: 30,
			}))
		);

		await assert.rejects(
			() => appointmentService.create(baseAppointmentData()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /consultorio seleccionado no pertenece/i);
				return true;
			}
		);
		assert.equal(tx.finished, 'rollback');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create rechaza turnos en fecha y hora pasada', async () => {
	const restores = [];
	const tx = createTransaction();

	try {
		restores.push(stubMethod(sequelize, 'transaction', async () => tx));
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-1',
				appointmentDuration: 30,
			}))
		);
		restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => false));

		await assert.rejects(
			() => appointmentService.create(baseAppointmentData()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /fecha y hora pasada/i);
				return true;
			}
		);
		assert.equal(tx.finished, 'rollback');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create rechaza slots bloqueados por el profesional', async () => {
	const restores = [];
	const tx = createTransaction();

	try {
		restores.push(stubMethod(sequelize, 'transaction', async () => tx));
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-1',
				appointmentDuration: 30,
			}))
		);
		restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => true));
		restores.push(stubMethod(officeBlockService, 'isBlocked', async () => true));

		await assert.rejects(
			() => appointmentService.create(baseAppointmentData()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /bloqueado por el profesional/i);
				return true;
			}
		);
		assert.equal(tx.finished, 'rollback');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create rechaza conflictos horarios del profesional en el consultorio', async () => {
	const restores = [];
	const tx = createTransaction();
	let conflictCalls = [];

	try {
		restores.push(stubMethod(sequelize, 'transaction', async () => tx));
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-1',
				appointmentDuration: 30,
			}))
		);
		restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => true));
		restores.push(stubMethod(officeBlockService, 'isBlocked', async () => false));
		restores.push(
			stubMethod(appointmentService, '_hasTimeConflict', async (payload) => {
				conflictCalls.push(payload);
				return conflictCalls.length === 1;
			})
		);

		await assert.rejects(
			() => appointmentService.create(baseAppointmentData()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /se superpone/i);
				return true;
			}
		);
		assert.equal(conflictCalls.length, 1);
		assert.equal(conflictCalls[0].professionalId, 'professional-1');
		assert.equal(conflictCalls[0].officeId, 'office-1');
		assert.equal(tx.finished, 'rollback');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create rechaza conflictos horarios del paciente', async () => {
	const restores = [];
	const tx = createTransaction();
	let conflictCalls = [];

	try {
		restores.push(stubMethod(sequelize, 'transaction', async () => tx));
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-1',
				appointmentDuration: 30,
			}))
		);
		restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => true));
		restores.push(stubMethod(officeBlockService, 'isBlocked', async () => false));
		restores.push(
			stubMethod(appointmentService, '_hasTimeConflict', async (payload) => {
				conflictCalls.push(payload);
				return conflictCalls.length === 2;
			})
		);

		await assert.rejects(
			() => appointmentService.create(baseAppointmentData()),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /paciente ya tiene un turno/i);
				return true;
			}
		);
		assert.equal(conflictCalls.length, 2);
		assert.equal(conflictCalls[1].patientId, 'patient-1');
		assert.equal(tx.finished, 'rollback');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create crea turnos confirmados cuando agenda el paciente', async () => {
	const restores = [];

	try {
		const { tx, getCreatePayload, getFindOrCreatePayload } = stubCreateHappyPath(restores, {
			getByIdResult: { id: 'appointment-created', status: 'confirmed' },
		});

		const result = await appointmentService.create(baseAppointmentData({ createdBy: 'patient' }));

		assert.equal(result.status, 'confirmed');
		assert.equal(getCreatePayload()?.status, 'confirmed');
		assert.equal(getCreatePayload()?.duration, 30);
		assert.deepEqual(getFindOrCreatePayload()?.where, {
			patientId: 'patient-1',
			professionalId: 'professional-1',
		});
		assert.equal(tx.finished, 'commit');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create crea turnos pendientes cuando agenda el profesional', async () => {
	const restores = [];

	try {
		const { tx, getCreatePayload } = stubCreateHappyPath(restores, {
			getByIdResult: { id: 'appointment-created', status: 'pending' },
		});

		const result = await appointmentService.create(
			baseAppointmentData({
				createdBy: 'professional',
				duration: undefined,
			})
		);

		assert.equal(result.status, 'pending');
		assert.equal(getCreatePayload()?.status, 'pending');
		assert.equal(getCreatePayload()?.duration, 30);
		assert.equal(tx.finished, 'commit');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.create maneja concurrencia y deja un solo turno exitoso por slot', async () => {
	const restores = [];
	const transactions = [createTransaction('tx-1'), createTransaction('tx-2')];
	let txIndex = 0;
	let createCallCount = 0;
	let firstCreateArrivedResolve;
	let secondCreateArrivedResolve;
	const firstCreateArrived = new Promise((resolve) => {
		firstCreateArrivedResolve = resolve;
	});
	const secondCreateArrived = new Promise((resolve) => {
		secondCreateArrivedResolve = resolve;
	});

	try {
		restores.push(
			stubMethod(sequelize, 'transaction', async () => transactions[txIndex++])
		);
		restores.push(stubMethod(sequelize, 'query', async () => []));
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: 'professional-1',
				appointmentDuration: 30,
			}))
		);
		restores.push(stubMethod(appointmentService, '_isFutureAppointment', () => true));
		restores.push(stubMethod(officeBlockService, 'isBlocked', async () => false));
		restores.push(stubMethod(appointmentService, '_hasTimeConflict', async () => false));
		restores.push(
			stubMethod(Appointment, 'create', async () => {
				createCallCount += 1;

				if (createCallCount === 1) {
					firstCreateArrivedResolve();
					await secondCreateArrived;
					return { id: 'appointment-concurrent-1' };
				}

				secondCreateArrivedResolve();
				await firstCreateArrived;
				const error = new Error('slot conflict');
				error.original = { code: '23P01' };
				throw error;
			})
		);
		restores.push(stubMethod(PatientProfessional, 'findOrCreate', async () => [{}, true]));
		restores.push(
			stubMethod(appointmentService, 'getById', async (appointmentId) => ({
				id: appointmentId,
				status: 'confirmed',
			}))
		);

		const [first, second] = await Promise.allSettled([
			appointmentService.create(baseAppointmentData({ reason: 'Concurrente 1' })),
			appointmentService.create(baseAppointmentData({ reason: 'Concurrente 2' })),
		]);

		const results = [first, second];
		const fulfilled = results.filter((result) => result.status === 'fulfilled');
		const rejected = results.filter((result) => result.status === 'rejected');

		assert.equal(fulfilled.length, 1);
		assert.equal(rejected.length, 1);
		assert.equal(fulfilled[0].value.id, 'appointment-concurrent-1');
		assert.ok(rejected[0].reason instanceof ApiError);
		assert.equal(rejected[0].reason.statusCode, 409);
		assert.match(rejected[0].reason.message, /dej. de estar disponible/i);
		assert.equal(transactions.filter((tx) => tx.finished === 'commit').length, 1);
		assert.equal(transactions.filter((tx) => tx.finished === 'rollback').length, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.confirm confirma un turno pendiente', async () => {
	const restores = [];
	let updatedPayload = null;

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-pending',
				status: 'pending',
				async update(payload) {
					updatedPayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(appointmentService, 'getById', async (appointmentId) => ({
				id: appointmentId,
				status: 'confirmed',
			}))
		);

		const result = await appointmentService.confirm('appointment-pending');

		assert.equal(updatedPayload?.status, 'confirmed');
		assert.equal(result.status, 'confirmed');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.confirm rechaza estados invalidos', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-confirmed',
				status: 'confirmed',
			}))
		);

		await assert.rejects(
			() => appointmentService.confirm('appointment-confirmed'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /solo turnos pendientes/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.cancel cancela turnos activos con razon', async () => {
	const restores = [];
	let updatedPayload = null;

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-confirmed',
				status: 'confirmed',
				async update(payload) {
					updatedPayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(appointmentService, 'getById', async (appointmentId) => ({
				id: appointmentId,
				status: 'cancelled',
			}))
		);

		const result = await appointmentService.cancel('appointment-confirmed', 'Paciente no puede asistir');

		assert.deepEqual(updatedPayload, {
			status: 'cancelled',
			cancellationReason: 'Paciente no puede asistir',
		});
		assert.equal(result.status, 'cancelled');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.cancel rechaza turnos ya completados', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-completed',
				status: 'completed',
			}))
		);

		await assert.rejects(
			() => appointmentService.cancel('appointment-completed', 'No aplica'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /ya completado/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.cancel rechaza turnos ya cancelados', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-cancelled',
				status: 'cancelled',
			}))
		);

		await assert.rejects(
			() => appointmentService.cancel('appointment-cancelled', 'No aplica'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /ya est. cancelado/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.complete permite completar turnos confirmados en el pasado', async () => {
	const restores = [];
	let updatedPayload = null;
	const past = new Date(Date.now() - 60 * 60 * 1000);

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-past',
				status: 'confirmed',
				date: formatDate(past),
				time: `${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}:00`,
				async update(payload) {
					updatedPayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(appointmentService, 'getById', async (appointmentId) => ({
				id: appointmentId,
				status: 'completed',
			}))
		);

		const result = await appointmentService.complete('appointment-past');

		assert.deepEqual(updatedPayload, { status: 'completed' });
		assert.equal(result.status, 'completed');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.complete rechaza estados distintos de confirmed', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-pending',
				status: 'pending',
				date: createFutureDate(),
				time: '09:00:00',
			}))
		);

		await assert.rejects(
			() => appointmentService.complete('appointment-pending'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /solo turnos confirmados/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AppointmentService.complete rechaza turnos futuros aunque esten confirmados', async () => {
	const future = new Date(Date.now() + 60 * 60 * 1000);
	const restores = [];

	try {
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-future',
				status: 'confirmed',
				date: formatDate(future),
				time: `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}:00`,
				update: async () => {
					throw new Error('No deberia intentar completar un turno futuro.');
				},
			}))
		);

		await assert.rejects(
			() => appointmentService.complete('appointment-future'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /turno futuro/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
