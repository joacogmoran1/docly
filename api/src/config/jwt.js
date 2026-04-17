import env from './env.js';

const secret = env.auth.jwtSecret || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION';

const sharedCookieOptions = {
	secure: env.auth.cookieSecure,
	sameSite: env.auth.sameSite,
	...(env.auth.cookieDomain ? { domain: env.auth.cookieDomain } : {}),
};

export const jwtConfig = {
	secret,

	accessExpiresIn: env.auth.accessExpiresIn,
	accessCookieOptions: {
		httpOnly: true,
		...sharedCookieOptions,
		maxAge: 60 * 60 * 1000,
		path: '/',
	},

	refreshExpiresIn: env.auth.refreshExpiresIn,
	refreshCookieOptions: {
		httpOnly: true,
		...sharedCookieOptions,
		maxAge: 30 * 24 * 60 * 60 * 1000,
		path: '/api/auth',
	},

	expiresIn: env.auth.accessExpiresIn,
	cookieOptions: {
		httpOnly: true,
		...sharedCookieOptions,
		maxAge: 60 * 60 * 1000,
	},
};
