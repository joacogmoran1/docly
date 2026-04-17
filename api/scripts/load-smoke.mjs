const baseUrl = normalizeBaseUrl(process.env.LOAD_TEST_URL || 'http://localhost:4000');
const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
const concurrency = parseInteger(process.env.LOAD_TEST_CONCURRENCY, 20);
const requests = parseInteger(process.env.LOAD_TEST_REQUESTS, 100);
const csrfHeaderName = (process.env.LOAD_TEST_CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase();
const defaultSearchTerm = process.env.LOAD_TEST_SEARCH_QUERY || 'garcia';
const startDate = process.env.LOAD_TEST_START_DATE || offsetDate(1);
const endDate = process.env.LOAD_TEST_END_DATE || offsetDate(30);

const requestedScenarioNames = parseCsv(
	process.env.LOAD_TEST_SCENARIOS ||
		'health,login,patient-appointments,professional-availability,professional-search'
);

main().catch((error) => {
	console.error(
		JSON.stringify(
			{
				success: false,
				message: error.message,
				stack: error.stack,
			},
			null,
			2
		)
	);
	process.exitCode = 1;
});

async function main() {
	const scenarioFactories = {
		health: createHealthScenario,
		login: createLoginScenario,
		'patient-appointments': createPatientAppointmentsScenario,
		'professional-availability': createProfessionalAvailabilityScenario,
		'professional-search': createProfessionalSearchScenario,
	};

	const report = [];

	for (const scenarioName of requestedScenarioNames) {
		const factory = scenarioFactories[scenarioName];

		if (!factory) {
			report.push({
				scenario: scenarioName,
				skipped: true,
				reason: 'Escenario desconocido.',
			});
			continue;
		}

		const scenario = await factory();
		if (scenario.skipped) {
			report.push({
				scenario: scenarioName,
				skipped: true,
				reason: scenario.reason,
			});
			continue;
		}

		const results = await runScenario(scenario);
		report.push(results);
	}

	const hasFailures = report.some(
		(item) => !item.skipped && (item.failures > 0 || item.unexpectedStatuses?.length > 0)
	);

	console.log(
		JSON.stringify(
			{
				baseUrl: apiBaseUrl,
				concurrency,
				requests,
				report,
			},
			null,
			2
		)
	);

	if (hasFailures) {
		process.exitCode = 1;
	}
}

async function runScenario(scenario) {
	const results = [];

	for (let cursor = 0; cursor < requests; cursor += concurrency) {
		const batchSize = Math.min(concurrency, requests - cursor);
		const batchResults = await Promise.all(
			Array.from({ length: batchSize }, (_, index) =>
				executeScenarioHit(scenario, cursor + index)
			)
		);
		results.push(...batchResults);
	}

	if (typeof scenario.cleanup === 'function') {
		await scenario.cleanup();
	}

	const durations = results.map((result) => result.durationMs);
	const sortedDurations = [...durations].sort((left, right) => left - right);
	const failures = results.filter((result) => result.status >= 400).length;
	const statuses = countBy(results, (result) => String(result.status));
	const unexpectedStatuses = Object.keys(statuses).filter(
		(status) => !scenario.expectedStatuses.includes(Number(status))
	);

	return {
		scenario: scenario.name,
		target: scenario.target,
		failures,
		expectedStatuses: scenario.expectedStatuses,
		unexpectedStatuses,
		statuses,
		averageMs: roundNumber(average(durations)),
		p95Ms: roundNumber(percentile(sortedDurations, 0.95)),
		maxMs: roundNumber(sortedDurations[sortedDurations.length - 1] || 0),
	};
}

async function executeScenarioHit(scenario, index) {
	const startedAt = performance.now();
	const response = await scenario.hit(index);
	const durationMs = performance.now() - startedAt;

	return {
		index,
		status: response.status,
		durationMs,
	};
}

async function createHealthScenario() {
	return {
		name: 'health',
		target: '/health',
		expectedStatuses: [200],
		hit: async () => requestJson('/health'),
	};
}

async function createLoginScenario() {
	const credentials = readCredentials('LOAD_TEST_PATIENT_EMAIL', 'LOAD_TEST_PATIENT_PASSWORD');
	if (!credentials) {
		return {
			skipped: true,
			reason: 'Faltan LOAD_TEST_PATIENT_EMAIL y LOAD_TEST_PATIENT_PASSWORD para medir login.',
		};
	}

	return {
		name: 'login',
		target: '/auth/login',
		expectedStatuses: [200],
		hit: async () => {
			const jar = new CookieJar();
			const csrfResponse = await requestJson('/auth/csrf-token', { jar });
			const csrfToken = csrfResponse.body?.csrfToken || jar.get('csrf_token');

			const loginResponse = await requestJson('/auth/login', {
				method: 'POST',
				jar,
				csrfToken,
				body: credentials,
			});

			if (loginResponse.status === 200) {
				await requestJson('/auth/logout', {
					method: 'POST',
					jar,
					csrfToken,
				});
			}

			return loginResponse;
		},
	};
}

async function createPatientAppointmentsScenario() {
	const session = await createSessionFromEnv(
		'LOAD_TEST_PATIENT_EMAIL',
		'LOAD_TEST_PATIENT_PASSWORD',
		'turnos del paciente'
	);

	if (session.skipped) {
		return session;
	}

	const patientId = session.user?.patient?.id;
	if (!patientId) {
		return {
			skipped: true,
			reason: 'La cuenta configurada para paciente no devolvio patient.id.',
		};
	}

	return {
		name: 'patient-appointments',
		target: `/appointments/patient/${patientId}`,
		expectedStatuses: [200],
		hit: async () => requestJson(`/appointments/patient/${patientId}`, { jar: session.jar }),
	};
}

async function createProfessionalAvailabilityScenario() {
	const professionalSession =
		(await createSessionFromEnv(
			'LOAD_TEST_PROFESSIONAL_EMAIL',
			'LOAD_TEST_PROFESSIONAL_PASSWORD',
			'disponibilidad profesional'
		)) ||
		{ skipped: true };

	let session = professionalSession;

	if (session.skipped) {
		session = await createSessionFromEnv(
			'LOAD_TEST_PATIENT_EMAIL',
			'LOAD_TEST_PATIENT_PASSWORD',
			'disponibilidad profesional'
		);
	}

	if (session.skipped) {
		return session;
	}

	const professionalId =
		process.env.LOAD_TEST_PROFESSIONAL_ID ||
		session.user?.professional?.id ||
		(await resolveProfessionalId(session));

	if (!professionalId) {
		return {
			skipped: true,
			reason:
				'No se pudo resolver LOAD_TEST_PROFESSIONAL_ID ni inferir un profesional desde la sesion.',
		};
	}

	return {
		name: 'professional-availability',
		target: `/professionals/${professionalId}/availability`,
		expectedStatuses: [200],
		hit: async () =>
			requestJson(
				`/professionals/${professionalId}/availability?startDate=${startDate}&endDate=${endDate}`,
				{ jar: session.jar }
			),
	};
}

async function createProfessionalSearchScenario() {
	let session = await createSessionFromEnv(
		'LOAD_TEST_PATIENT_EMAIL',
		'LOAD_TEST_PATIENT_PASSWORD',
		'busqueda de profesionales'
	);

	if (session.skipped) {
		session = await createSessionFromEnv(
			'LOAD_TEST_PROFESSIONAL_EMAIL',
			'LOAD_TEST_PROFESSIONAL_PASSWORD',
			'busqueda de profesionales'
		);
	}

	if (session.skipped) {
		return session;
	}

	return {
		name: 'professional-search',
		target: `/professionals/search?q=${encodeURIComponent(defaultSearchTerm)}`,
		expectedStatuses: [200],
		hit: async () =>
			requestJson(`/professionals/search?q=${encodeURIComponent(defaultSearchTerm)}`, {
				jar: session.jar,
			}),
	};
}

async function createSessionFromEnv(emailVar, passwordVar, label) {
	const credentials = readCredentials(emailVar, passwordVar);
	if (!credentials) {
		return {
			skipped: true,
			reason: `Faltan ${emailVar} y ${passwordVar} para medir ${label}.`,
		};
	}

	const jar = new CookieJar();
	const csrfResponse = await requestJson('/auth/csrf-token', { jar });
	const csrfToken = csrfResponse.body?.csrfToken || jar.get('csrf_token');
	const loginResponse = await requestJson('/auth/login', {
		method: 'POST',
		jar,
		csrfToken,
		body: credentials,
	});

	if (loginResponse.status !== 200 || !loginResponse.body?.user) {
		return {
			skipped: true,
			reason: `No se pudo iniciar sesion para ${label}. Status recibido: ${loginResponse.status}.`,
		};
	}

	return {
		jar,
		csrfToken,
		user: loginResponse.body.user,
	};
}

async function resolveProfessionalId(session) {
	const patientId = session.user?.patient?.id;
	if (!patientId) {
		return null;
	}

	const response = await requestJson(`/professionals/patients/${patientId}/professionals`, {
		jar: session.jar,
	});

	if (response.status !== 200 || !Array.isArray(response.body?.data)) {
		return null;
	}

	return response.body.data[0]?.id || null;
}

async function requestJson(path, { method = 'GET', jar, csrfToken, body } = {}) {
	const headers = {
		Accept: 'application/json',
	};

	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	if (jar) {
		const cookieHeader = jar.toHeader();
		if (cookieHeader) {
			headers.Cookie = cookieHeader;
		}
	}

	if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		headers[csrfHeaderName] = csrfToken;
	}

	const response = await fetch(`${apiBaseUrl}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (jar) {
		jar.merge(response);
	}

	const text = await response.text();
	let parsedBody = null;

	if (text) {
		try {
			parsedBody = JSON.parse(text);
		} catch {
			parsedBody = null;
		}
	}

	return {
		status: response.status,
		body: parsedBody,
	};
}

class CookieJar {
	constructor() {
		this.cookies = new Map();
	}

	get(name) {
		return this.cookies.get(name);
	}

	merge(response) {
		const setCookies =
			typeof response.headers.getSetCookie === 'function'
				? response.headers.getSetCookie()
				: splitSetCookieHeader(response.headers.get('set-cookie'));

		for (const setCookie of setCookies) {
			const [pair] = setCookie.split(';', 1);
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

function splitSetCookieHeader(value) {
	if (!value) {
		return [];
	}

	return String(value)
		.split(/,(?=[^;,]+?=)/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function readCredentials(emailVar, passwordVar) {
	const email = process.env[emailVar];
	const password = process.env[passwordVar];

	if (!email || !password) {
		return null;
	}

	return {
		email: String(email).trim(),
		password: String(password),
	};
}

function parseCsv(value) {
	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseInteger(value, fallback) {
	const parsed = Number.parseInt(String(value ?? fallback), 10);

	if (!Number.isFinite(parsed) || parsed < 1) {
		throw new Error(`Valor entero invalido: ${value}`);
	}

	return parsed;
}

function normalizeBaseUrl(value) {
	return String(value).trim().replace(/\/+$/, '');
}

function offsetDate(days) {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
}

function formatDate(date) {
	return date.toISOString().slice(0, 10);
}

function average(values) {
	if (!values.length) {
		return 0;
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues, ratio) {
	if (!sortedValues.length) {
		return 0;
	}

	const index = Math.min(
		sortedValues.length - 1,
		Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
	);

	return sortedValues[index];
}

function countBy(values, getKey) {
	return values.reduce((accumulator, item) => {
		const key = getKey(item);
		accumulator[key] = (accumulator[key] || 0) + 1;
		return accumulator;
	}, {});
}

function roundNumber(value) {
	return Number(value.toFixed(2));
}
