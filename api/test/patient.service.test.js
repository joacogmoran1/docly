import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';

import patientService from '../src/services/patientService.js';
import ApiError from '../src/utils/ApiError.js';
import { HealthInfo, Patient, User } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

test('PatientService.search devuelve vacio cuando falta query o professionalId', async () => {
	assert.deepEqual(await patientService.search('   ', 'professional-1'), {
		patients: [],
		total: 0,
		limit: 20,
		offset: 0,
	});
	assert.deepEqual(await patientService.search('garcia', null), {
		patients: [],
		total: 0,
		limit: 20,
		offset: 0,
	});
});

test('PatientService.search arma filtros por termino y profesional vinculado', async () => {
	const restores = [];
	let receivedArgs = null;

	try {
		restores.push(
			stubMethod(Patient, 'findAndCountAll', async args => {
				receivedArgs = args;
				return { rows: [{ id: 'patient-1' }], count: 12 };
			})
		);

		const result = await patientService.search(' garcia ', 'professional-1', {
			limit: '500',
			offset: '20',
		});

		assert.deepEqual(result, {
			patients: [{ id: 'patient-1' }],
			total: 12,
			limit: 200,
			offset: 20,
		});
		assert.equal(receivedArgs.where[Op.or].length, 7);
		assert.equal(receivedArgs.include[1].where.id, 'professional-1');
		assert.equal(receivedArgs.limit, 200);
		assert.equal(receivedArgs.offset, 20);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PatientService.updateProfile actualiza paciente y usuario cuando llegan datos personales', async () => {
	const restores = [];
	let patientPayload = null;
	let userUpdateArgs = null;

	try {
		restores.push(
			stubMethod(Patient, 'findByPk', async patientId => ({
				id: patientId,
				userId: 'user-1',
				async update(payload) {
					patientPayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(User, 'update', async (payload, options) => {
				userUpdateArgs = { payload, options };
				return [1];
			})
		);
		restores.push(
			stubMethod(patientService, 'getProfile', async patientId => ({
				id: patientId,
				user: userUpdateArgs.payload,
			}))
		);

		const result = await patientService.updateProfile('patient-1', {
			dni: '30111222',
			gender: 'female',
			name: 'Ana',
			lastName: 'Paciente',
			phone: '+5491112345678',
		});

		assert.deepEqual(patientPayload, {
			dni: '30111222',
			birthDate: undefined,
			gender: 'female',
			bloodType: undefined,
			medicalCoverage: undefined,
			coverageNumber: undefined,
		});
		assert.deepEqual(userUpdateArgs, {
			payload: {
				name: 'Ana',
				lastName: 'Paciente',
				phone: '+5491112345678',
			},
			options: {
				where: { id: 'user-1' },
			},
		});
		assert.equal(result.id, 'patient-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PatientService.updateProfile rechaza pacientes inexistentes', async () => {
	const restores = [];

	try {
		restores.push(stubMethod(Patient, 'findByPk', async () => null));

		await assert.rejects(
			() => patientService.updateProfile('missing-patient', { dni: '1' }),
			error => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 404);
				assert.match(error.message, /paciente no encontrado/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PatientService.getHealthInfo crea un registro vacio si no existe', async () => {
	const restores = [];
	let createdPayload = null;

	try {
		restores.push(stubMethod(HealthInfo, 'findOne', async () => null));
		restores.push(
			stubMethod(HealthInfo, 'create', async payload => {
				createdPayload = payload;
				return { id: 'health-1', ...payload };
			})
		);

		const result = await patientService.getHealthInfo('patient-1');

		assert.deepEqual(createdPayload, { patientId: 'patient-1' });
		assert.equal(result.id, 'health-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PatientService.updateHealthInfo actualiza el registro existente', async () => {
	const restores = [];
	let updatePayload = null;

	try {
		restores.push(
			stubMethod(HealthInfo, 'findOne', async () => ({
				id: 'health-1',
				async update(payload) {
					updatePayload = payload;
				},
			}))
		);

		const result = await patientService.updateHealthInfo('patient-1', {
			diseases: 'Asma',
			allergies: 'Penicilina',
			medications: 'Salbutamol',
		});

		assert.deepEqual(updatePayload, {
			diseases: 'Asma',
			allergies: 'Penicilina',
			medications: 'Salbutamol',
		});
		assert.equal(result.id, 'health-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PatientService.updateHealthInfo crea el registro si no existe', async () => {
	const restores = [];
	let createdPayload = null;

	try {
		restores.push(stubMethod(HealthInfo, 'findOne', async () => null));
		restores.push(
			stubMethod(HealthInfo, 'create', async payload => {
				createdPayload = payload;
				return { id: 'health-2', ...payload };
			})
		);

		const result = await patientService.updateHealthInfo('patient-1', {
			diseases: 'Diabetes',
			allergies: 'Ninguna',
			medications: 'Metformina',
		});

		assert.deepEqual(createdPayload, {
			patientId: 'patient-1',
			diseases: 'Diabetes',
			allergies: 'Ninguna',
			medications: 'Metformina',
		});
		assert.equal(result.id, 'health-2');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
