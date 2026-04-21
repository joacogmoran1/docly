import test from 'node:test';
import assert from 'node:assert/strict';

import prescriptionPdfService from '../src/services/prescriptionPdfService.js';
import ApiError from '../src/utils/ApiError.js';
import { Prescription } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

const SIGNATURE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8/5+hHgAHggJ/P9sVewAAAABJRU5ErkJggg==';

test('PrescriptionPdfService.generate rechaza recetas inexistentes', async () => {
	const restores = [];

	try {
		restores.push(stubMethod(Prescription, 'findByPk', async () => null));

		await assert.rejects(
			() => prescriptionPdfService.generate('prescription-1'),
			error => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 404);
				assert.match(error.message, /receta no encontrada/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PrescriptionPdfService.generate rechaza recetas sin firma del profesional', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Prescription, 'findByPk', async () => ({
				id: 'prescription-1',
				patient: {
					user: { name: 'Ana', lastName: 'Paciente' },
				},
				professional: {
					signature: null,
					user: { name: 'Luis', lastName: 'Medico' },
				},
			}))
		);

		await assert.rejects(
			() => prescriptionPdfService.generate('prescription-1'),
			error => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 400);
				assert.match(error.message, /firma cargada/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('PrescriptionPdfService.generate devuelve un PDF valido cuando la receta tiene firma', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Prescription, 'findByPk', async () => ({
				id: 'prescription-1',
				createdAt: '2099-01-10T10:00:00.000Z',
				validUntil: '2099-02-10',
				diagnosis: 'Hipertension',
				instructions: 'Tomar despues del desayuno',
				medications: [
					{
						name: 'Losartan',
						dose: '50mg',
						frequency: 'Cada 12 horas',
						duration: '30 dias',
					},
				],
				patient: {
					dni: '30111222',
					medicalCoverage: 'OSDE',
					coverageNumber: '1234',
					user: {
						name: 'Ana',
						lastName: 'Paciente',
						email: 'ana@example.com',
						phone: '1112345678',
					},
				},
				professional: {
					signature: SIGNATURE,
					specialty: 'Cardiologia',
					licenseNumber: 'MN 12345',
					user: {
						name: 'Luis',
						lastName: 'Medico',
						email: 'luis@example.com',
						phone: '1199998888',
					},
				},
			}))
		);

		const pdfBuffer = await prescriptionPdfService.generate('prescription-1');

		assert.ok(Buffer.isBuffer(pdfBuffer));
		assert.ok(pdfBuffer.length > 0);
		assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF');
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
