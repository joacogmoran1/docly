import http from 'node:http';

import app from '../src/app.js';

export class CookieJar {
	constructor() {
		this.cookies = new Map();
	}

	get(name) {
		return this.cookies.get(name);
	}

	setFromResponse(headers) {
		for (const cookie of headers['set-cookie'] || []) {
			const [pair] = cookie.split(';', 1);
			const separatorIndex = pair.indexOf('=');
			if (separatorIndex <= 0) {
				continue;
			}

			const name = pair.slice(0, separatorIndex).trim();
			const value = pair.slice(separatorIndex + 1).trim();

			if (value) {
				this.cookies.set(name, value);
			} else {
				this.cookies.delete(name);
			}
		}
	}

	toHeader() {
		return Array.from(this.cookies.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	}
}

export function startTestServer() {
	return app.listen(0);
}

export function stopTestServer(server) {
	return new Promise((resolve) => server.close(resolve));
}

export async function requestJson(server, path, { method = 'GET', headers = {}, jar, body } = {}) {
	const payload = body === undefined ? undefined : JSON.stringify(body);
	const requestHeaders = {
		Accept: 'application/json',
		...headers,
	};

	if (payload !== undefined) {
		requestHeaders['Content-Type'] = 'application/json';
	}

	if (jar) {
		const cookieHeader = jar.toHeader();
		if (cookieHeader) {
			requestHeaders.Cookie = cookieHeader;
		}
	}

	const response = await new Promise((resolve, reject) => {
		const address = server.address();
		const req = http.request(
			{
				host: '127.0.0.1',
				port: address.port,
				path,
				method,
				headers: requestHeaders,
			},
			(res) => {
				let rawBody = '';
				res.on('data', (chunk) => {
					rawBody += chunk;
				});
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						rawBody,
					});
				});
			}
		);

		req.on('error', reject);

		if (payload !== undefined) {
			req.write(payload);
		}

		req.end();
	});

	if (jar) {
		jar.setFromResponse(response.headers);
	}

	let bodyJson = null;
	if (response.rawBody) {
		try {
			bodyJson = JSON.parse(response.rawBody);
		} catch {
			bodyJson = null;
		}
	}

	return {
		statusCode: response.statusCode,
		headers: response.headers,
		rawBody: response.rawBody,
		body: bodyJson,
	};
}

export async function issueCsrfToken(server, jar = new CookieJar()) {
	const response = await requestJson(server, '/api/auth/csrf-token', { jar });
	const csrfToken = response.body?.csrfToken || jar.get('csrf_token');

	return {
		response,
		jar,
		csrfToken,
	};
}

export function withCsrf(csrfToken, headers = {}) {
	return {
		'x-csrf-token': csrfToken,
		...headers,
	};
}
