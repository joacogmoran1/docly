const baseUrl = normalizeBaseUrl(process.env.BOOKING_TEST_BASE_URL || 'http://localhost:4000');
const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
const concurrency = parseInteger(process.env.BOOKING_TEST_CONCURRENCY, 5);
const startDate = process.env.BOOKING_TEST_START_DATE || offsetDate(1);
const endDate = process.env.BOOKING_TEST_END_DATE || offsetDate(30);
const explicitDate = process.env.BOOKING_TEST_DATE || null;
const explicitTime = process.env.BOOKING_TEST_TIME || null;
const explicitProfessionalId = process.env.BOOKING_TEST_PROFESSIONAL_ID || null;
const explicitOfficeId = process.env.BOOKING_TEST_OFFICE_ID || null;
const csrfHeaderName = (process.env.BOOKING_TEST_CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase();
const bookingReasonPrefix = process.env.BOOKING_TEST_REASON_PREFIX || 'Concurrent booking probe';

main().catch((error) => {
	console.error(JSON.stringify({
		success: false,
		message: error.message,
		stack: error.stack,
	}, null, 2));
	process.exitCode = 1;
});

async function main() {
	const credentials = parsePatientCredentials();
	const sessions = await Promise.all(credentials.map((credential) => loginSession(credential)));
	const bookingSession = sessions[0];
	const professional = await resolveProfessional(bookingSession);
	const slot = explicitDate && explicitTime
		? {
			date: explicitDate,
			time: explicitTime,
			officeId: explicitOfficeId || professional.offices?.[0]?.id,
		}
		: await findAvailableSlot(bookingSession, professional);

	if (!slot?.officeId) {
		throw new Error('No se pudo resolver el consultorio para la prueba de concurrencia.');
	}

	const attempts = Array.from({ length: concurrency }, (_, index) => {
		const session = sessions[index % sessions.length];
		return createAppointmentAttempt(session, professional.id, slot, index);
	});
	const results = await Promise.all(attempts);

	const successes = results.filter((result) => result.status === 201);
	const conflicts = results.filter((result) => result.status === 400 || result.status === 409);
	const unexpected = results.filter((result) => ![201, 400, 409].includes(result.status));
	const createdIds = successes
		.map((result) => result.body?.data?.id)
		.filter(Boolean);

	const cleanupResults = await Promise.all(
		successes.map((result) => cancelAppointment(result.session, result.body?.data?.id))
	);
	const passed = successes.length === 1 && conflicts.length === concurrency - 1 && unexpected.length === 0;

	console.log(JSON.stringify({
		success: passed,
		baseUrl: apiBaseUrl,
		concurrency,
		patientsUsed: sessions.length,
		professionalId: professional.id,
		officeId: slot.officeId,
		date: slot.date,
		time: slot.time,
		successes: successes.length,
		conflicts: conflicts.length,
		unexpectedStatuses: unexpected.map((result) => result.status),
		createdAppointmentIds: createdIds,
		cleanupResults,
		results: results.map((result) => ({
			index: result.index,
			status: result.status,
			message: result.body?.message || result.body?.error || null,
			appointmentId: result.body?.data?.id || null,
			email: result.session.user?.email || null,
		})),
	}, null, 2));

	if (!passed) {
		process.exitCode = 1;
	}
}

function parsePatientCredentials() {
	const jsonValue = process.env.BOOKING_TEST_PATIENTS_JSON;
	if (jsonValue) {
		const parsed = JSON.parse(jsonValue);
		if (!Array.isArray(parsed) || parsed.length === 0) {
			throw new Error('BOOKING_TEST_PATIENTS_JSON debe ser un array no vacío.');
		}

		return parsed.map(normalizeCredential);
	}

	return [
		normalizeCredential({
			email: requiredEnv('BOOKING_TEST_PATIENT_EMAIL'),
			password: requiredEnv('BOOKING_TEST_PATIENT_PASSWORD'),
		}),
	];
}

function normalizeCredential(value) {
	if (!value?.email || !value?.password) {
		throw new Error('Cada credencial de paciente debe incluir email y password.');
	}

	return {
		email: String(value.email).trim(),
		password: String(value.password),
	};
}

async function loginSession({ email, password }) {
	const jar = new CookieJar();
	const csrfResponse = await requestJson('/auth/csrf-token', { jar });
	const csrfToken = csrfResponse.body?.csrfToken || jar.get('csrf_token');

	if (!csrfToken) {
		throw new Error(`No se pudo obtener CSRF token para ${email}.`);
	}

	const loginResponse = await requestJson('/auth/login', {
		method: 'POST',
		jar,
		csrfToken,
		body: { email, password },
	});

	if (loginResponse.status !== 200 || !loginResponse.body?.user) {
		throw new Error(`Login falló para ${email} con status ${loginResponse.status}.`);
	}

	return {
		email,
		jar,
		csrfToken,
		user: loginResponse.body.user,
	};
}

async function resolveProfessional(session) {
	if (explicitProfessionalId) {
		const professionalResponse = await requestJson(`/professionals/${explicitProfessionalId}`, {
			jar: session.jar,
		});

		if (professionalResponse.status !== 200 || !professionalResponse.body?.data) {
			throw new Error(`No se pudo cargar el profesional ${explicitProfessionalId}.`);
		}

		return professionalResponse.body.data;
	}

	const patientId = session.user?.patient?.id;
	if (!patientId) {
		throw new Error('No se pudo inferir patientId desde la sesión para descubrir un profesional.');
	}

	const teamResponse = await requestJson(`/professionals/patients/${patientId}/professionals`, {
		jar: session.jar,
	});

	if (teamResponse.status !== 200 || !Array.isArray(teamResponse.body?.data)) {
		throw new Error('No se pudo cargar el equipo médico del paciente.');
	}

	const professional = teamResponse.body.data.find((item) => (item.offices || []).length > 0);
	if (!professional) {
		throw new Error('No hay profesionales con consultorios disponibles para la prueba.');
	}

	return professional;
}

async function findAvailableSlot(session, professional) {
	const availabilityResponse = await requestJson(
		`/professionals/${professional.id}/availability?startDate=${startDate}&endDate=${endDate}`,
		{ jar: session.jar }
	);

	if (availabilityResponse.status !== 200 || !availabilityResponse.body?.data) {
		throw new Error('No se pudo consultar la disponibilidad del profesional.');
	}

	const availability = availabilityResponse.body.data;
	const offices = explicitOfficeId
		? availability.offices.filter((office) => office.id === explicitOfficeId)
		: availability.offices;

	for (const office of offices) {
		const slot = pickSlotForOffice(office, availability.appointments, availability.blocks);
		if (slot) {
			return slot;
		}
	}

	throw new Error('No se encontró un slot libre en el rango configurado.');
}

function pickSlotForOffice(office, appointments = [], blocks = []) {
	const appointmentIndex = new Map();
	const blockIndex = new Map();
	const fullDayBlocks = new Set();
	const duration = Number(office.appointmentDuration || 30);

	for (const appointment of appointments.filter((item) => item.officeId === office.id)) {
		const key = appointment.date;
		if (!appointmentIndex.has(key)) {
			appointmentIndex.set(key, new Set());
		}
		appointmentIndex.get(key).add(String(appointment.time).slice(0, 5));
	}

	for (const block of blocks.filter((item) => item.officeId === office.id)) {
		const key = block.date;
		if (block.type === 'full_day') {
			fullDayBlocks.add(key);
			continue;
		}

		if (!blockIndex.has(key)) {
			blockIndex.set(key, []);
		}

		blockIndex.get(key).push({
			start: String(block.startTime).slice(0, 5),
			end: String(block.endTime).slice(0, 5),
		});
	}

	for (const date of iterateDates(startDate, endDate)) {
		if (fullDayBlocks.has(date)) {
			continue;
		}

		const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
		const schedules = (office.schedules || []).filter((schedule) => Number(schedule.dayOfWeek) === dayOfWeek);
		if (!schedules.length) {
			continue;
		}

		const occupied = appointmentIndex.get(date) || new Set();
		const blockedRanges = blockIndex.get(date) || [];

		for (const schedule of schedules) {
			const slots = buildTimeSlots(schedule.startTime, schedule.endTime, duration);

			for (const slot of slots) {
				if (occupied.has(slot)) {
					continue;
				}

				const isBlocked = blockedRanges.some((range) => slot >= range.start && slot < range.end);
				if (isBlocked) {
					continue;
				}

				return {
					officeId: office.id,
					date,
					time: slot,
				};
			}
		}
	}

	return null;
}

function buildTimeSlots(startTime, endTime, durationMinutes) {
	const [startHour, startMinute] = String(startTime).slice(0, 5).split(':').map(Number);
	const [endHour, endMinute] = String(endTime).slice(0, 5).split(':').map(Number);
	const start = startHour * 60 + startMinute;
	const end = endHour * 60 + endMinute;
	const slots = [];

	for (let cursor = start; cursor + durationMinutes <= end; cursor += durationMinutes) {
		const hour = String(Math.floor(cursor / 60)).padStart(2, '0');
		const minute = String(cursor % 60).padStart(2, '0');
		slots.push(`${hour}:${minute}`);
	}

	return slots;
}

function iterateDates(from, to) {
	const dates = [];
	const cursor = new Date(`${from}T00:00:00`);
	const end = new Date(`${to}T00:00:00`);

	while (cursor <= end) {
		dates.push(formatDate(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}

	return dates;
}

async function createAppointmentAttempt(session, professionalId, slot, index) {
	const response = await requestJson('/appointments', {
		method: 'POST',
		jar: session.jar,
		csrfToken: session.csrfToken,
		body: {
			professionalId,
			officeId: slot.officeId,
			date: slot.date,
			time: slot.time,
			reason: `${bookingReasonPrefix} #${index + 1}`,
		},
	});

	return {
		index,
		status: response.status,
		body: response.body,
		session,
	};
}

async function cancelAppointment(session, appointmentId) {
	if (!appointmentId) {
		return { appointmentId: null, status: 'skipped' };
	}

	const response = await requestJson(`/appointments/${appointmentId}/cancel`, {
		method: 'POST',
		jar: session.jar,
		csrfToken: session.csrfToken,
		body: {
			reason: 'Cleanup automático de prueba de concurrencia',
		},
	});

	return {
		appointmentId,
		status: response.status,
	};
}

async function requestJson(path, { method = 'GET', jar, csrfToken, body } = {}) {
	const headers = {
		Accept: 'application/json',
	};

	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	const cookieHeader = jar?.toHeader();
	if (cookieHeader) {
		headers.Cookie = cookieHeader;
	}

	if (csrfToken && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
		headers[csrfHeaderName] = csrfToken;
	}

	const response = await fetch(`${apiBaseUrl}${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	jar?.merge(response);

	const text = await response.text();
	let parsedBody = null;

	if (text) {
		try {
			parsedBody = JSON.parse(text);
		} catch {
			parsedBody = { raw: text };
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
		const setCookies = typeof response.headers.getSetCookie === 'function'
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
			this.cookies.set(name, value);
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
		map((item) => item.trim())
		filter(Boolean);
}

function normalizeBaseUrl(value) {
	return String(value).trim().replace(/\/+$/, '');
}

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Falta la variable ${name}.`);
	}
	return value;
}

function parseInteger(value, fallback) {
	const parsed = Number.parseInt(String(value ?? fallback), 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		throw new Error(`Valor entero inválido: ${value}`);
	}
	return parsed;
}

function offsetDate(days) {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
}

function formatDate(date) {
	return date.toISOString().slice(0, 10);
}
