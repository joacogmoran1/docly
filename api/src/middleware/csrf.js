import ApiError from '../utils/ApiError.js';
import csrfService from '../services/csrfService.js';
import env from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection = (req, res, next) => {
	if (SAFE_METHODS.has(req.method)) {
		return next();
	}

	const cookieToken = req.cookies?.[env.security.csrfCookieName];
	const headerToken = req.get(env.security.csrfHeaderName);

	if (!cookieToken || !headerToken || cookieToken !== headerToken) {
		return next(new ApiError(403, 'CSRF token inválido o ausente.'));
	}

	if (!csrfService.verifyToken(cookieToken)) {
		return next(new ApiError(403, 'CSRF token inválido o adulterado.'));
	}

	return next();
};
