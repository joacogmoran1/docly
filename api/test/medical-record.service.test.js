import test from 'node:test';
import assert from 'node:assert/strict';

import medicalRecordService from '../src/services/medicalRecordService.js';
import ApiError from '../src/utils/ApiError.js';
import {
	Appointment,
	MedicalRecord,
	Patient,
	PatientProfessional,
	Professional,
} from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

test('MedicalRecordService.create rechaza turnos que no pertenecen al paciente o profesional indicado', async () => {
	const restores = [];

	try {
		restores.push(stubMethod(Patient, 'findByPk', async () => ({ id: 'patient-1' })));
		restores.push(stubMethod(Professional, 'findByPk', async () => ({ id: 'professional-1' })));
		restores.push(
			stubMethod(Appointment, 'findByPk', async () => ({
				id: 'appointment-1',
				patientId: 'patient-2',
				professionalId: 'professional-1',
			}))
		);

		await assert.rejects(
			() =>
				medicalRecordService.create({
					patientId: 'patient-1',
					professionalId: 'professional-1',
					appointmentId: 'appointment-1',
					reason: 'Control',
				}),
			error => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /turno no corresponde/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('MedicalRecordService.create persiste solo campos permitidos y asegura el vinculo paciente-profesional', async () => {
	const restores = [];
	let createdPayload = null;
	let linkedWhere = null;

	try {
		restores.push(stubMethod(Patient, 'findByPk', async () => ({ id: 'patient-1' })));
		restores.push(stubMethod(Professional, 'findByPk', async () => ({ id: 'professional-1' })));
		restores.push(
			stubMethod(MedicalRecord, 'create', async payload => {
				createdPayload = payload;
				return { id: 'record-1' };
			})
		);
		restores.push(
			stubMethod(PatientProfessional, 'findOrCreate', async ({ where }) => {
				linkedWhere = where;
				return [{}, true];
			})
		);
		restores.push(
			stubMethod(medicalRecordService, 'getById', async recordId => ({
				id: recordId,
				reason: createdPayload.reason,
			}))
		);

		const result = await medicalRecordService.create({
			patientId: 'patient-1',
			professionalId: 'professional-1',
			date: '2099-01-10',
			reason: 'Control general',
			diagnosis: 'Apto',
			foo: 'bar',
		});

		assert.deepEqual(createdPayload, {
			patientId: 'patient-1',
			professionalId: 'professional-1',
			date: '2099-01-10',
			reason: 'Control general',
			diagnosis: 'Apto',
		});
		assert.deepEqual(linkedWhere, {
			patientId: 'patient-1',
			professionalId: 'professional-1',
		});
		assert.equal(result.id, 'record-1');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('MedicalRecordService.update ignora campos no permitidos', async () => {
	const restores = [];
	let updatePayload = null;

	try {
		restores.push(
			stubMethod(MedicalRecord, 'findByPk', async () => ({
				id: 'record-1',
				async update(payload) {
					updatePayload = payload;
				},
			}))
		);
		restores.push(
			stubMethod(medicalRecordService, 'getById', async recordId => ({
				id: recordId,
				reason: updatePayload.reason,
				diagnosis: updatePayload.diagnosis,
			}))
		);

		const result = await medicalRecordService.update('record-1', {
			reason: 'Control anual',
			diagnosis: 'Sin hallazgos',
			patientId: 'patient-2',
			professionalId: 'professional-2',
		});

		assert.deepEqual(updatePayload, {
			reason: 'Control anual',
			diagnosis: 'Sin hallazgos',
		});
		assert.equal(result.diagnosis, 'Sin hallazgos');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
