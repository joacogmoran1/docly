// No permitir secret por defecto en producción
const secret = process.env.JWT_SECRET;

if (!secret && process.env.NODE_ENV === 'production') {
	throw new Error('JWT_SECRET debe estar definido en producción. El servidor no puede iniciar sin esta variable.');
}

export const jwtConfig = {
	secret: secret || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION',

	// ── Access token ────────────────────────────────────────────────────
	// Corta vida: el frontend renueva automáticamente vía refresh token.
	accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
	accessCookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 1000, // 1 hora
		path: '/',
	},

	// ── Refresh token ───────────────────────────────────────────────────
	// Larga vida, almacenado en DB para revocación, path restringido.
	refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
	refreshCookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
		path: '/api/auth', // Solo se envía a endpoints de auth
	},

	// ── Deprecado — mantener para compatibilidad transitoria ─────────
	/** @deprecated Usar accessExpiresIn */
	expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
	/** @deprecated Usar accessCookieOptions */
	cookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 1000,
	},
};
