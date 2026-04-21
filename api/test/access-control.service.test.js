import test from 'node:test';
import assert from 'node:assert/strict';

import accessControlService from '../src/services/accessControlService.js';
import ApiError from '../src/utils/ApiError.js';
import {
	Appointment,
	MedicalRecord,
	Office,
	PatientProfessional,
	Prescription,
	Study,
} from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

const PATIENT_ID = 'patient-1';
const PROFESSIONAL_ID = 'professional-1';
const OTHER_PATIENT_ID = 'patient-2';
const OTHER_PROFESSIONAL_ID = 'professional-2';

function patientUser(patientId = PATIENT_ID) {
	return {
		role: 'patient',
		patient: { id: patientId },
		professional: null,
	};
}

function professionalUser(professionalId = PROFESSIONAL_ID) {
	return {
		role: 'professional',
		patient: null,
		professional: { id: professionalId },
	};
}

test('AccessControlService.hasPatientProfessionalLink devuelve true cuando existe un link directo', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(PatientProfessional, 'findOne', async ({ where }) => {
				assert.deepEqual(where, {
					professionalId: PROFESSIONAL_ID,
					patientId: PATIENT_ID,
				});
				return { patientId: PATIENT_ID };
			})
		);
		restores.push(stubMethod(Appointment, 'findOne', async () => {
			throw new Error('No deberia consultar appointment si existe link directo');
		}));
		restores.push(stubMethod(MedicalRecord, 'findOne', async () => {
			throw new Error('No deberia consultar medical records si existe link directo');
		}));
		restores.push(stubMethod(Prescription, 'findOne', async () => {
			throw new Error('No deberia consultar prescriptions si existe link directo');
		}));
		restores.push(stubMethod(Study, 'findOne', async () => {
			throw new Error('No deberia consultar studies si existe link directo');
		}));

		const hasLink = await accessControlService.hasPatientProfessionalLink(
			PROFESSIONAL_ID,
			PATIENT_ID
		);

		assert.equal(hasLink, true);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.hasPatientProfessionalLink usa evidencia clinica cuando no existe link directo', async () => {
	const restores = [];
	let appointmentLookup = 0;
	let medicalRecordLookup = 0;
	let prescriptionLookup = 0;
	let studyLookup = 0;

	try {
		restores.push(stubMethod(PatientProfessional, 'findOne', async () => null));
		restores.push(
			stubMethod(Appointment, 'findOne', async ({ where }) => {
				appointmentLookup += 1;
				assert.deepEqual(where, {
					professionalId: PROFESSIONAL_ID,
					patientId: PATIENT_ID,
				});
				return null;
			})
		);
		restores.push(
			stubMethod(MedicalRecord, 'findOne', async () => {
				medicalRecordLookup += 1;
				return null;
			})
		);
		restores.push(
			stubMethod(Prescription, 'findOne', async () => {
				prescriptionLookup += 1;
				return { id: 'prescription-1' };
			})
		);
		restores.push(
			stubMethod(Study, 'findOne', async () => {
				studyLookup += 1;
				return null;
			})
		);

		const hasLink = await accessControlService.hasPatientProfessionalLink(
			PROFESSIONAL_ID,
			PATIENT_ID
		);

		assert.equal(hasLink, true);
		assert.equal(appointmentLookup, 1);
		assert.equal(medicalRecordLookup, 1);
		assert.equal(prescriptionLookup, 1);
		assert.equal(studyLookup, 1);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.assertProfessionalCanAccessPatient rechaza cuando no hay vinculo', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(accessControlService, 'hasPatientProfessionalLink', async () => false)
		);

		await assert.rejects(
			() =>
				accessControlService.assertProfessionalCanAccessPatient(
					professionalUser(),
					PATIENT_ID
				),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 403);
				assert.match(error.message, /v.nculo/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.getOwnedOffice devuelve el consultorio del profesional dueno', async () => {
	const restores = [];
	const office = {
		id: 'office-1',
		professionalId: PROFESSIONAL_ID,
	};

	try {
		restores.push(
			stubMethod(Office, 'findByPk', async (officeId) => {
				assert.equal(officeId, 'office-1');
				return office;
			})
		);

		const ownedOffice = await accessControlService.getOwnedOffice(
			professionalUser(),
			'office-1'
		);

		assert.equal(ownedOffice, office);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.getOwnedOffice rechaza cuando el consultorio pertenece a otro profesional', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(Office, 'findByPk', async () => ({
				id: 'office-1',
				professionalId: OTHER_PROFESSIONAL_ID,
			}))
		);

		await assert.rejects(
			() => accessControlService.getOwnedOffice(professionalUser(), 'office-1'),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 403);
				assert.match(error.message, /consultorio/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.assertMedicalRecordReadAccess permite al paciente leer su propio registro', () => {
	const result = accessControlService.assertMedicalRecordReadAccess(
		patientUser(),
		{
			patientId: PATIENT_ID,
			professionalId: OTHER_PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertMedicalRecordReadAccess permite al profesional autor leer el registro', () => {
	const result = accessControlService.assertMedicalRecordReadAccess(
		professionalUser(),
		{
			patientId: OTHER_PATIENT_ID,
			professionalId: PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertMedicalRecordReadAccess rechaza a un tercero ajeno', () => {
	assert.throws(
		() =>
			accessControlService.assertMedicalRecordReadAccess(professionalUser(), {
				patientId: OTHER_PATIENT_ID,
				professionalId: OTHER_PROFESSIONAL_ID,
			}),
		(error) => {
			assert.ok(error instanceof ApiError);
			assert.equal(error.statusCode, 403);
			assert.match(error.message, /registro m.dico/i);
			return true;
		}
	);
});

test('AccessControlService.assertPrescriptionReadAccess permite al paciente leer su propia receta', () => {
	const result = accessControlService.assertPrescriptionReadAccess(
		patientUser(),
		{
			patientId: PATIENT_ID,
			professionalId: OTHER_PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertPrescriptionReadAccess permite al profesional emisor leer la receta', () => {
	const result = accessControlService.assertPrescriptionReadAccess(
		professionalUser(),
		{
			patientId: OTHER_PATIENT_ID,
			professionalId: PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertPrescriptionReadAccess rechaza a un tercero ajeno', () => {
	assert.throws(
		() =>
			accessControlService.assertPrescriptionReadAccess(professionalUser(), {
				patientId: OTHER_PATIENT_ID,
				professionalId: OTHER_PROFESSIONAL_ID,
			}),
		(error) => {
			assert.ok(error instanceof ApiError);
			assert.equal(error.statusCode, 403);
			assert.match(error.message, /receta/i);
			return true;
		}
	);
});

test('AccessControlService.assertStudyReadAccess permite al paciente leer su propio estudio', async () => {
	const result = await accessControlService.assertStudyReadAccess(
		patientUser(),
		{
			patientId: PATIENT_ID,
			professionalId: null,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertStudyReadAccess permite al profesional autor leer el estudio', async () => {
	const result = await accessControlService.assertStudyReadAccess(
		professionalUser(),
		{
			patientId: OTHER_PATIENT_ID,
			professionalId: PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertStudyReadAccess permite a un profesional vinculado leer un estudio subido por paciente', async () => {
	const restores = [];
	let linkLookupArgs = null;

	try {
		restores.push(
			stubMethod(accessControlService, 'hasPatientProfessionalLink', async (professionalId, patientId) => {
				linkLookupArgs = { professionalId, patientId };
				return true;
			})
		);

		const result = await accessControlService.assertStudyReadAccess(
			professionalUser(),
			{
				patientId: PATIENT_ID,
				professionalId: null,
			}
		);

		assert.equal(result, true);
		assert.deepEqual(linkLookupArgs, {
			professionalId: PROFESSIONAL_ID,
			patientId: PATIENT_ID,
		});
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.assertStudyReadAccess rechaza a un profesional sin vinculo sobre estudio de paciente', async () => {
	const restores = [];

	try {
		restores.push(
			stubMethod(accessControlService, 'hasPatientProfessionalLink', async () => false)
		);

		await assert.rejects(
			() =>
				accessControlService.assertStudyReadAccess(professionalUser(), {
					patientId: PATIENT_ID,
					professionalId: null,
				}),
			(error) => {
				assert.ok(error instanceof ApiError);
				assert.equal(error.statusCode, 403);
				assert.match(error.message, /estudio/i);
				return true;
			}
		);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('AccessControlService.assertStudyWriteAccess permite al paciente editar un estudio propio sin profesional asignado', () => {
	const result = accessControlService.assertStudyWriteAccess(
		patientUser(),
		{
			patientId: PATIENT_ID,
			professionalId: null,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertStudyWriteAccess permite al profesional editar su propio estudio', () => {
	const result = accessControlService.assertStudyWriteAccess(
		professionalUser(),
		{
			patientId: OTHER_PATIENT_ID,
			professionalId: PROFESSIONAL_ID,
		}
	);

	assert.equal(result, true);
});

test('AccessControlService.assertStudyWriteAccess rechaza a un paciente sobre estudio emitido por profesional', () => {
	assert.throws(
		() =>
			accessControlService.assertStudyWriteAccess(patientUser(), {
				patientId: PATIENT_ID,
				professionalId: PROFESSIONAL_ID,
			}),
		(error) => {
			assert.ok(error instanceof ApiError);
			assert.equal(error.statusCode, 403);
			assert.match(error.message, /modificar este estudio/i);
			return true;
		}
	);
});
