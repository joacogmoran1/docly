import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

export function readEnv(name) {
	const directValue = process.env[name];

	if (directValue !== undefined && directValue !== null && directValue !== '') {
		return directValue;
	}

	const filePath = process.env[`${name}_FILE`];

	if (filePath === undefined || filePath === null || filePath === '') {
		return directValue;
	}

	try {
		return fs.readFileSync(filePath, 'utf8').trim();
	} catch (error) {
		throw new Error(`No se pudo leer ${name}_FILE desde "${filePath}": ${error.message}`);
	}
}

function parseInteger(value, fallback, { min } = {}) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	if (!Number.isFinite(parsed)) {
		throw new Error(`Valor entero inválido: "${value}"`);
	}

	if (typeof min === 'number' && parsed < min) {
		throw new Error(`El valor "${value}" debe ser mayor o igual a ${min}.`);
	}

	return parsed;
}

function parseBoolean(value, fallback = false) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	const normalized = String(value).trim().toLowerCase();

	if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
		return true;
	}

	if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
		return false;
	}

	throw new Error(`Valor booleano inválido: "${value}"`);
}

function parseChoice(value, fallback, allowedValues, label) {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	const normalized = String(value).trim().toLowerCase();

	if (!allowedValues.includes(normalized)) {
		throw new Error(`${label} inválido: "${value}". Valores permitidos: ${allowedValues.join(', ')}.`);
	}

	return normalized;
}

function parseCsv(value) {
	if (!value) {
		return [];
	}

	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseSameSite(value, fallback = 'lax') {
	const normalized = (value || fallback).toString().trim().toLowerCase();
	if (!['strict', 'lax', 'none'].includes(normalized)) {
		throw new Error(`AUTH_COOKIE_SAME_SITE inválido: "${value}"`);
	}
	return normalized;
}

function parseTrustProxy(value) {
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (/^\d+$/.test(String(value).trim())) {
		return Number.parseInt(String(value).trim(), 10);
	}

	const normalized = String(value).trim().toLowerCase();
	if (['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(normalized)) {
		return parseBoolean(normalized);
	}

	return value;
}

function parseDatabaseUrl(value) {
	if (!value) {
		return null;
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(value);
	} catch (error) {
		throw new Error(`DATABASE_URL inválida: "${value}"`);
	}

	if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
		throw new Error('DATABASE_URL debe usar el esquema postgres:// o postgresql://.');
	}

	return {
		url: value,
		host: parsedUrl.hostname || undefined,
		port: parsedUrl.port ? parseInteger(parsedUrl.port, 5432, { min: 1 }) : 5432,
		name: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : undefined,
		user: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
		password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
	};
}

const frontendUrls = parseCsv(readEnv('FRONTEND_URLS') || readEnv('FRONTEND_URL'));
const parsedDatabaseUrl = parseDatabaseUrl(readEnv('DATABASE_URL'));

const env = {
	nodeEnv: readEnv('NODE_ENV') || 'development',
	port: parseInteger(readEnv('PORT'), 4000, { min: 1 }),
	trustProxy: parseTrustProxy(readEnv('TRUST_PROXY')),
	cors: {
		allowedOrigins: frontendUrls,
	},
	bodyLimit: readEnv('BODY_LIMIT') || '10mb',
	db: {
		url: parsedDatabaseUrl?.url,
		host: parsedDatabaseUrl?.host || readEnv('DB_HOST'),
		port: parsedDatabaseUrl?.port || parseInteger(readEnv('DB_PORT'), 5432, { min: 1 }),
		name: parsedDatabaseUrl?.name || readEnv('DB_NAME'),
		user: parsedDatabaseUrl?.user || readEnv('DB_USER'),
		password: parsedDatabaseUrl?.password || readEnv('DB_PASSWORD'),
		poolMax: parseInteger(readEnv('DB_POOL_MAX'), 20, { min: 1 }),
		poolMin: parseInteger(readEnv('DB_POOL_MIN'), 0, { min: 0 }),
		poolAcquireMs: parseInteger(readEnv('DB_POOL_ACQUIRE_MS'), 30000, { min: 1000 }),
		poolIdleMs: parseInteger(readEnv('DB_POOL_IDLE_MS'), 10000, { min: 1000 }),
		ssl: parseBoolean(readEnv('DB_SSL'), false),
		sslRejectUnauthorized: parseBoolean(readEnv('DB_SSL_REJECT_UNAUTHORIZED'), true),
	},
	auth: {
		jwtSecret: readEnv('JWT_SECRET'),
		accessExpiresIn: readEnv('JWT_ACCESS_EXPIRES_IN') || readEnv('JWT_EXPIRES_IN') || '1h',
		refreshExpiresIn: readEnv('JWT_REFRESH_EXPIRES_IN') || '30d',
		cookieDomain: readEnv('AUTH_COOKIE_DOMAIN') || undefined,
		sameSite: parseSameSite(
			readEnv('AUTH_COOKIE_SAME_SITE'),
			readEnv('NODE_ENV') === 'production' ? 'lax' : 'lax'
		),
		cookieSecure: parseBoolean(
			readEnv('AUTH_COOKIE_SECURE'),
			readEnv('NODE_ENV') === 'production'
		),
	},
	security: {
		csrfSecret: readEnv('CSRF_SECRET'),
		csrfCookieName: readEnv('CSRF_COOKIE_NAME') || 'csrf_token',
		csrfHeaderName: (readEnv('CSRF_HEADER_NAME') || 'x-csrf-token').toLowerCase(),
	},
	rateLimit: {
		windowMs: parseInteger(readEnv('RATE_LIMIT_WINDOW_MS'), 15 * 60 * 1000, { min: 1000 }),
		maxRequests: parseInteger(readEnv('RATE_LIMIT_MAX_REQUESTS'), 200, { min: 1 }),
		authWindowMs: parseInteger(readEnv('AUTH_RATE_LIMIT_WINDOW_MS'), 15 * 60 * 1000, { min: 1000 }),
		authMaxRequests: parseInteger(readEnv('AUTH_RATE_LIMIT_MAX_REQUESTS'), 10, { min: 1 }),
		registerWindowMs: parseInteger(
			readEnv('REGISTER_RATE_LIMIT_WINDOW_MS'),
			60 * 60 * 1000,
			{ min: 1000 }
		),
		registerMaxRequests: parseInteger(readEnv('REGISTER_RATE_LIMIT_MAX_REQUESTS'), 5, { min: 1 }),
		refreshWindowMs: parseInteger(
			readEnv('REFRESH_RATE_LIMIT_WINDOW_MS'),
			10 * 60 * 1000,
			{ min: 1000 }
		),
		refreshMaxRequests: parseInteger(readEnv('REFRESH_RATE_LIMIT_MAX_REQUESTS'), 20, { min: 1 }),
		passwordResetWindowMs: parseInteger(
			readEnv('PASSWORD_RESET_RATE_LIMIT_WINDOW_MS'),
			60 * 60 * 1000,
			{ min: 1000 }
		),
		passwordResetMaxRequests: parseInteger(
			readEnv('PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS'),
			5,
			{ min: 1 }
		),
		passwordResetConfirmWindowMs: parseInteger(
			readEnv('PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS'),
			30 * 60 * 1000,
			{ min: 1000 }
		),
		passwordResetConfirmMaxRequests: parseInteger(
			readEnv('PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS'),
			10,
			{ min: 1 }
		),
		searchWindowMs: parseInteger(readEnv('SEARCH_RATE_LIMIT_WINDOW_MS'), 60 * 1000, { min: 1000 }),
		searchMaxRequests: parseInteger(readEnv('SEARCH_RATE_LIMIT_MAX_REQUESTS'), 60, { min: 1 }),
		agendaWindowMs: parseInteger(readEnv('AGENDA_RATE_LIMIT_WINDOW_MS'), 60 * 1000, { min: 1000 }),
		agendaMaxRequests: parseInteger(readEnv('AGENDA_RATE_LIMIT_MAX_REQUESTS'), 120, { min: 1 }),
		store: parseChoice(
			readEnv('RATE_LIMIT_STORE'),
			'sequelize',
			['sequelize', 'redis'],
			'RATE_LIMIT_STORE'
		),
		staleEntryMs: parseInteger(readEnv('RATE_LIMIT_STALE_ENTRY_MS'), 60 * 60 * 1000, { min: 1000 }),
		redisKeyPrefix: readEnv('RATE_LIMIT_REDIS_KEY_PREFIX') || 'docly:rate-limit:',
	},
	maintenance: {
		enabled: parseBoolean(readEnv('MAINTENANCE_ENABLED'), true),
		runOnStartup: parseBoolean(readEnv('MAINTENANCE_RUN_ON_STARTUP'), true),
		cleanupIntervalMs: parseInteger(readEnv('MAINTENANCE_CLEANUP_INTERVAL_MS'), 15 * 60 * 1000, { min: 1000 }),
	},
	redis: {
		url: readEnv('REDIS_URL'),
		host: readEnv('REDIS_HOST'),
		port: parseInteger(readEnv('REDIS_PORT'), 6379, { min: 1 }),
		username: readEnv('REDIS_USERNAME'),
		password: readEnv('REDIS_PASSWORD'),
		db: parseInteger(readEnv('REDIS_DB'), 0, { min: 0 }),
		tls: parseBoolean(readEnv('REDIS_TLS'), false),
	},
	email: {
		host: readEnv('SMTP_HOST'),
		port: parseInteger(readEnv('SMTP_PORT'), 587, { min: 1 }),
		secure: parseBoolean(readEnv('SMTP_SECURE'), false),
		user: readEnv('SMTP_USER'),
		pass: readEnv('SMTP_PASS'),
		from: readEnv('EMAIL_FROM') || '"Docly" <no-reply@docly.app>',
	},
	logging: {
		level: readEnv('LOG_LEVEL') || 'info',
		enableFileLogs: parseBoolean(readEnv('LOG_TO_FILES'), readEnv('NODE_ENV') !== 'production'),
	},
};

function requireInProduction(name, value) {
	if (env.nodeEnv === 'production' && (value === undefined || value === null || value === '')) {
		throw new Error(`La variable ${name} es obligatoria en producción.`);
	}
}

requireInProduction('DATABASE_URL o DB_HOST', env.db.host);
requireInProduction('DATABASE_URL o DB_NAME', env.db.name);
requireInProduction('DATABASE_URL o DB_USER', env.db.user);
requireInProduction('DATABASE_URL o DB_PASSWORD', env.db.password);
requireInProduction('JWT_SECRET', env.auth.jwtSecret);
requireInProduction('CSRF_SECRET', env.security.csrfSecret);
requireInProduction('FRONTEND_URLS/FRONTEND_URL', env.cors.allowedOrigins[0]);
requireInProduction('SMTP_HOST', env.email.host);
requireInProduction('SMTP_USER', env.email.user);
requireInProduction('SMTP_PASS', env.email.pass);

if (env.auth.sameSite === 'none' && !env.auth.cookieSecure) {
	throw new Error('AUTH_COOKIE_SAME_SITE=none requiere AUTH_COOKIE_SECURE=true.');
}

if (env.nodeEnv === 'production' && !env.cors.allowedOrigins.length) {
	throw new Error('Debes definir al menos un origen frontend permitido en producción.');
}

export default env;
