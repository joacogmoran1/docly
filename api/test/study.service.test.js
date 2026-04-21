import test from 'node:test';
import assert from 'node:assert/strict';

import studyService from '../src/services/studyService.js';
import cloudinaryService from '../src/services/cloudinaryService.js';
import { Patient, Professional, PatientProfessional, Study } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

test('StudyService.create conserva multiples links en fileUrl sin truncarlos', async () => {
	const restores = [];
	let createdPayload = null;

	const longSegment = 'a'.repeat(180);
	const firstUrl = `https://example.com/images/${longSegment}-1.jpg`;
	const secondUrl = `https://example.com/images/${longSegment}-2.jpg`;
	const fileUrl = `${firstUrl}, ${secondUrl}`;

	try {
		restores.push(stubMethod(Patient, 'findByPk', async () => ({ id: 'patient-1' })));
		restores.push(stubMethod(Professional, 'findByPk', async () => ({ id: 'professional-1' })));
		restores.push(stubMethod(PatientProfessional, 'findOrCreate', async () => [{}, true]));
		restores.push(
			stubMethod(Study, 'create', async payload => {
				createdPayload = payload;
				return { id: 'study-1' };
			})
		);
		restores.push(
			stubMethod(studyService, 'getById', async id => ({
				id,
				fileUrl: createdPayload?.fileUrl,
			}))
		);

		const study = await studyService.create({
			patientId: 'patient-1',
			professionalId: 'professional-1',
			type: 'Radiografia',
			date: '2099-01-01',
			results: 'https://example.com/report.pdf',
			fileUrl,
		});

		assert.equal(createdPayload?.fileUrl, `${firstUrl}, ${secondUrl}`);
		assert.ok(createdPayload?.fileUrl.length > 255);
		assert.equal(study.fileUrl, `${firstUrl}, ${secondUrl}`);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('StudyService.create sube PDFs base64 a Cloudinary antes de persistirlos', async () => {
	const restores = [];
	let createdPayload = null;
	let uploadedDataUri = null;
	const pdfDataUri = 'data:application/pdf;base64,JVBERi0xLjQK';
	const cloudinaryUrl = 'https://res.cloudinary.com/demo/raw/upload/v1/docly/studies/report.pdf';

	try {
		restores.push(stubMethod(Patient, 'findByPk', async () => ({ id: 'patient-1' })));
		restores.push(stubMethod(Professional, 'findByPk', async () => null));
		restores.push(
			stubMethod(cloudinaryService, 'uploadDataUri', async dataUri => {
				uploadedDataUri = dataUri;
				return cloudinaryUrl;
			})
		);
		restores.push(
			stubMethod(Study, 'create', async payload => {
				createdPayload = payload;
				return { id: 'study-1' };
			})
		);
		restores.push(
			stubMethod(studyService, 'getById', async id => ({
				id,
				fileUrl: createdPayload?.fileUrl,
			}))
		);

		const study = await studyService.create({
			patientId: 'patient-1',
			type: 'Laboratorio',
			date: '2099-01-01',
			fileUrl: pdfDataUri,
		});

		assert.equal(uploadedDataUri, pdfDataUri);
		assert.equal(createdPayload?.fileUrl, cloudinaryUrl);
		assert.equal(study.fileUrl, cloudinaryUrl);
		assert.ok(!createdPayload?.fileUrl.startsWith('data:'));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('StudyService.update sube resultados base64 a Cloudinary antes de persistirlos', async () => {
	const restores = [];
	let updatePayload = null;
	const pdfDataUri = 'data:application/pdf;base64,JVBERi0xLjQK';
	const cloudinaryUrl = 'https://res.cloudinary.com/demo/raw/upload/v1/docly/studies/results.pdf';

	try {
		restores.push(
			stubMethod(Study, 'findByPk', async () => ({
				id: 'study-1',
				update: async payload => {
					updatePayload = payload;
				},
			}))
		);
		restores.push(stubMethod(cloudinaryService, 'uploadDataUri', async () => cloudinaryUrl));
		restores.push(stubMethod(studyService, 'getById', async id => ({ id, results: updatePayload?.results })));

		const study = await studyService.update('study-1', {
			results: pdfDataUri,
		});

		assert.equal(updatePayload?.results, cloudinaryUrl);
		assert.equal(study.results, cloudinaryUrl);
		assert.ok(!updatePayload?.results.startsWith('data:'));
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
