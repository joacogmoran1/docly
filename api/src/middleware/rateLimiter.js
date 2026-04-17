import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { createRateLimitStore } from './stores/rateLimitStoreFactory.js';

function normalizeIdentifier(value) {
	return String(value || '')
		.trim()
		.toLowerCase()
		.slice(0, 200);
}

function authKeyGenerator(req) {
	const email = normalizeIdentifier(req.body?.email);
	const token = normalizeIdentifier(req.body?.token);

	if (email) {
		return `auth:${req.ip}:${email}`;
	}

	if (token) {
		return `auth:${req.ip}:${token}`;
	}

	return `auth:${req.ip}`;
}

function requestActorKey(req) {
	const userId = normalizeIdentifier(req.user?.id);
	const role = normalizeIdentifier(req.user?.role);

	if (userId) {
		return `user:${role || 'unknown'}:${userId}`;
	}

	return `ip:${req.ip}`;
}

function searchKeyGenerator(req) {
	const query = normalizeIdentifier(req.query?.q);
	return `search:${requestActorKey(req)}:${query || 'empty'}`;
}

function agendaKeyGenerator(req) {
	const professionalId = normalizeIdentifier(
		req.params?.professionalId || req.query?.professionalId || req.body?.professionalId
	);
	const patientId = normalizeIdentifier(
		req.params?.patientId || req.query?.patientId || req.body?.patientId
	);

	return `agenda:${requestActorKey(req)}:${professionalId || patientId || 'generic'}`;
}

function buildLimiter({
	name,
	windowMs,
	max,
	message,
	keyGenerator,
	skipSuccessfulRequests = false,
}) {
	return rateLimit({
		windowMs,
		max,
		message,
		skipSuccessfulRequests,
		standardHeaders: true,
		legacyHeaders: false,
		store: createRateLimitStore(),
		...(keyGenerator ? { keyGenerator } : {}),
		handler(req, res, next, options) {
			logger.warn({
				type: 'security',
				event: 'rate_limit_triggered',
				limiter: name,
				ip: req.ip,
				method: req.method,
				path: req.originalUrl,
				userId: req.user?.id || null,
				role: req.user?.role || null,
			});

			return res.status(options.statusCode).json({
				success: false,
				message: options.message,
			});
		},
	});
}

export const apiLimiter = buildLimiter({
	name: 'api',
	windowMs: env.rateLimit.windowMs,
	max: env.rateLimit.maxRequests,
	message: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo más tarde.',
});

export const loginLimiter = buildLimiter({
	name: 'login',
	windowMs: env.rateLimit.authWindowMs,
	max: env.rateLimit.authMaxRequests,
	message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
	keyGenerator: authKeyGenerator,
	skipSuccessfulRequests: true,
});

export const registerLimiter = buildLimiter({
	name: 'register',
	windowMs: env.rateLimit.registerWindowMs,
	max: env.rateLimit.registerMaxRequests,
	message: 'Se alcanzó el límite de registros. Intenta de nuevo más tarde.',
	keyGenerator: authKeyGenerator,
	skipSuccessfulRequests: true,
});

export const refreshLimiter = buildLimiter({
	name: 'refresh',
	windowMs: env.rateLimit.refreshWindowMs,
	max: env.rateLimit.refreshMaxRequests,
	message: 'Demasiados refresh de sesión. Espera unos minutos antes de reintentar.',
	keyGenerator: authKeyGenerator,
});

export const forgotPasswordLimiter = buildLimiter({
	name: 'forgot-password',
	windowMs: env.rateLimit.passwordResetWindowMs,
	max: env.rateLimit.passwordResetMaxRequests,
	message: 'Demasiadas solicitudes de reseteo. Espera antes de volver a intentarlo.',
	keyGenerator: authKeyGenerator,
	skipSuccessfulRequests: true,
});

export const resetPasswordLimiter = buildLimiter({
	name: 'reset-password',
	windowMs: env.rateLimit.passwordResetConfirmWindowMs,
	max: env.rateLimit.passwordResetConfirmMaxRequests,
	message: 'Demasiados intentos de cambio de contraseña. Espera antes de reintentar.',
	keyGenerator: authKeyGenerator,
	skipSuccessfulRequests: true,
});

export const searchLimiter = buildLimiter({
	name: 'search',
	windowMs: env.rateLimit.searchWindowMs,
	max: env.rateLimit.searchMaxRequests,
	message: 'Demasiadas búsquedas en poco tiempo. Baja la frecuencia e intenta nuevamente.',
	keyGenerator: searchKeyGenerator,
});

export const agendaReadLimiter = buildLimiter({
	name: 'agenda',
	windowMs: env.rateLimit.agendaWindowMs,
	max: env.rateLimit.agendaMaxRequests,
	message: 'Demasiadas consultas de agenda en poco tiempo. Intenta nuevamente en breve.',
	keyGenerator: agendaKeyGenerator,
});

export const authLimiter = loginLimiter;
