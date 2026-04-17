import crypto from 'crypto';
import env from '../config/env.js';

function signTokenPayload(payload) {
	return crypto
		.createHmac('sha256', env.security.csrfSecret || env.auth.jwtSecret || 'dev-csrf-secret')
		.update(payload)
		.digest('hex');
}

class CsrfService {
	generateToken() {
		const payload = crypto.randomBytes(32).toString('hex');
		const signature = signTokenPayload(payload);
		return `${payload}.${signature}`;
	}

	verifyToken(token) {
		if (!token || typeof token !== 'string' || !token.includes('.')) {
			return false;
		}

		const [payload, signature] = token.split('.');
		if (!payload || !signature) {
			return false;
		}

		const expectedSignature = signTokenPayload(payload);
		if (signature.length !== expectedSignature.length) {
			return false;
		}

		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
	}

	getCookieOptions() {
		return {
			httpOnly: false,
			secure: env.auth.cookieSecure,
			sameSite: env.auth.sameSite,
			maxAge: 30 * 24 * 60 * 60 * 1000,
			path: '/',
			...(env.auth.cookieDomain ? { domain: env.auth.cookieDomain } : {}),
		};
	}

	issueCookie(res, token) {
		const csrfToken = token && this.verifyToken(token) ? token : this.generateToken();
		res.cookie(env.security.csrfCookieName, csrfToken, this.getCookieOptions());
		return csrfToken;
	}

	clearCookie(res) {
		res.clearCookie(env.security.csrfCookieName, {
			path: '/',
			...(env.auth.cookieDomain ? { domain: env.auth.cookieDomain } : {}),
		});
	}
}

export default new CsrfService();
