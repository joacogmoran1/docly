import crypto from 'node:crypto';

import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

function parseCloudinaryUrl(value) {
	if (!value) {
		return {};
	}

	let parsed;
	try {
		parsed = new URL(value);
	} catch {
		throw new ApiError(500, 'CLOUDINARY_URL no tiene un formato valido.');
	}

	if (parsed.protocol !== 'cloudinary:') {
		throw new ApiError(500, 'CLOUDINARY_URL debe usar el formato cloudinary://api_key:api_secret@cloud_name.');
	}

	return {
		cloudName: parsed.hostname,
		apiKey: decodeURIComponent(parsed.username || ''),
		apiSecret: decodeURIComponent(parsed.password || ''),
	};
}

function getCloudinaryConfig() {
	const urlConfig = parseCloudinaryUrl(env.cloudinary.url);
	const cloudName = env.cloudinary.cloudName || urlConfig.cloudName;
	const apiKey = env.cloudinary.apiKey || urlConfig.apiKey;
	const apiSecret = env.cloudinary.apiSecret || urlConfig.apiSecret;

	if (!cloudName || !apiKey || !apiSecret) {
		throw new ApiError(500, 'Cloudinary no esta configurado para almacenar archivos de estudios.');
	}

	return { cloudName, apiKey, apiSecret };
}

function signUploadParams(params, apiSecret) {
	const payload = Object.entries(params)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, value]) => `${key}=${value}`)
		.join('&');

	return crypto
		.createHash('sha1')
		.update(`${payload}${apiSecret}`)
		.digest('hex');
}

class CloudinaryService {
	async uploadDataUri(dataUri, options = {}) {
		const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
		const folder = options.folder || env.cloudinary.studyFolder;
		const resourceType = options.resourceType || 'raw';
		const timestamp = Math.floor(Date.now() / 1000);
		const signedParams = { folder, timestamp };
		const signature = signUploadParams(signedParams, apiSecret);
		const formData = new FormData();

		formData.set('file', dataUri);
		formData.set('api_key', apiKey);
		formData.set('timestamp', String(timestamp));
		formData.set('folder', folder);
		formData.set('signature', signature);

		let response;
		try {
			response = await fetch(
				`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
				{
					method: 'POST',
					body: formData,
				}
			);
		} catch {
			throw new ApiError(502, 'No se pudo conectar con Cloudinary para subir el estudio.');
		}

		let body = null;
		try {
			body = await response.json();
		} catch {
			body = null;
		}

		if (!response.ok || !body?.secure_url) {
			const detail = body?.error?.message ? ` Detalle: ${body.error.message}` : '';
			throw new ApiError(502, `No se pudo subir el archivo de estudio a Cloudinary.${detail}`);
		}

		return body.secure_url;
	}
}

export default new CloudinaryService();
