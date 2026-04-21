import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';

import officeBlockService from '../src/services/officeBlockService.js';
import ApiError from '../src/utils/ApiError.js';
import { Appointment, Office, OfficeBlock } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

test('OfficeBlockService.isBlocked devuelve true cuando existe un bloqueo de dia completo', async () => {
	const restores = [];
	let calls = 0;

	try {
		restores.push(
			stubMethod(OfficeBlock, 'findOne', async () => {
				calls += 1;
				return calls === 1 ? { id: 'block-1' } : null;
			})
		);

		const result = await officeBlockService.isBlocked('office-1', '2099-01-01', '10:00:00');

		assert.equal(result, true);
		assert.equal(calls, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('OfficeBlockService.isBlocked detecta bloqueos por rango horario', async () => {
	const restores = [];
	const whereCalls = [];

	try {
		restores.push(
			stubMethod(OfficeBlock, 'findOne', async ({ where }) => {
				whereCalls.push(where);
				return where.type === 'time_range' ? { id: 'block-2' } : null;
			})
		);

		const result = await officeBlockService.isBlocked('office-1', '2099-01-01', '10:30:00');

		assert.equal(result, true);
		assert.equal(whereCalls[1].startTime[Op.lte], '10:30:00');
		assert.equal(whereCalls[1].endTime[Op.gt], '10:30:00');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('OfficeBlockService.getByProfessional devuelve vacio cuando el profesional no tiene consultorios', async () => {
	const restores = [];

	try {
		restores.push(stubMethod(Office, 'findAll', async () => []));

		const result = await officeBlockService.getByProfessional('professional-1', {
			startDate: '2099-01-01',
		});

		assert.deepEqual(result, []);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('OfficeBlockService._buildConflictError transforma errores de exclusion en ApiError 409', async () => {
	const error = officeBlockService._buildConflictError({
		original: { code: '23P01' },
	});

	assert.ok(error instanceof ApiError);
	assert.equal(error.statusCode, 409);
	assert.match(error.message, /superpone|concurrente/i);
});

test('OfficeBlockService._cancelAppointments cancela turnos activos en un rango horario con motivo por defecto', async () => {
	const restores = [];
	let receivedArgs = null;

	try {
		restores.push(
			stubMethod(Appointment, 'update', async (payload, options) => {
				receivedArgs = { payload, options };
				return [3];
			})
		);

		const cancelled = await officeBlockService._cancelAppointments(
			'office-1',
			'2099-01-01',
			'09:00:00',
			'11:00:00',
			null,
			{ id: 'tx-1' }
		);

		assert.equal(cancelled, 3);
		assert.deepEqual(receivedArgs.payload, {
			status: 'cancelled',
			cancellationReason: 'Cancelado por bloqueo de horario',
		});
		assert.equal(receivedArgs.options.where.officeId, 'office-1');
		assert.equal(receivedArgs.options.where.time[Op.gte], '09:00:00');
		assert.equal(receivedArgs.options.where.time[Op.lt], '11:00:00');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
