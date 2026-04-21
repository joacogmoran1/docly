import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import env from '../src/config/env.js';
import cloudinaryService from '../src/services/cloudinaryService.js';
import { stubMethod } from '../test-support/stub.js';

test('CloudinaryService.uploadDataUri sube data URIs con firma y devuelve secure_url', async () => {
	const restores = [];
	const originalCloudinaryEnv = { ...env.cloudinary };
	const pdfDataUri = 'data:application/pdf;base64,JVBERi0xLjQK';
	const cloudinaryUrl = 'https://res.cloudinary.com/demo/raw/upload/v1/docly/studies/report.pdf';
	let requestUrl = null;
	let requestBody = null;

	try {
		env.cloudinary.url = null;
		env.cloudinary.cloudName = 'demo';
		env.cloudinary.apiKey = 'key';
		env.cloudinary.apiSecret = 'secret';
		env.cloudinary.studyFolder = 'docly/studies';

		restores.push(stubMethod(Date, 'now', () => 1_700_000_000_000));
		restores.push(
			stubMethod(globalThis, 'fetch', async (url, options) => {
				requestUrl = url;
				requestBody = options.body;
				return {
					ok: true,
					json: async () => ({ secure_url: cloudinaryUrl }),
				};
			})
		);

		const result = await cloudinaryService.uploadDataUri(pdfDataUri);
		const expectedSignature = crypto
			.createHash('sha1')
			.update('folder=docly/studies&timestamp=1700000000secret')
			.digest('hex');

		assert.equal(result, cloudinaryUrl);
		assert.equal(requestUrl, 'https://api.cloudinary.com/v1_1/demo/raw/upload');
		assert.equal(requestBody.get('file'), pdfDataUri);
		assert.equal(requestBody.get('api_key'), 'key');
		assert.equal(requestBody.get('timestamp'), '1700000000');
		assert.equal(requestBody.get('folder'), 'docly/studies');
		assert.equal(requestBody.get('signature'), expectedSignature);
	} finally {
		Object.assign(env.cloudinary, originalCloudinaryEnv);

		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
