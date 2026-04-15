// No permitir secret por defecto en producción
const secret = process.env.JWT_SECRET;

if (!secret && process.env.NODE_ENV === 'production') {
	throw new Error('JWT_SECRET debe estar definido en producción. El servidor no puede iniciar sin esta variable.');
}

export const jwtConfig = {
	secret: secret || 'dev-only-secret-DO-NOT-USE-IN-PRODUCTION',
	expiresIn: process.env.JWT_EXPIRES_IN || '7d',
	cookieOptions: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
	},
};