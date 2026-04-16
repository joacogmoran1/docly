import authService from '../services/authService.js';
import catchAsync from '../utils/catchAsync.js';

export const register = catchAsync(async (req, res) => {
	const { user } = await authService.register(req.body);

	// Setear ambas cookies (access + refresh)
	await authService.setAuthCookies(res, user.id);

	res.status(201).json({
		success: true,
		user,
	});
});

export const login = catchAsync(async (req, res) => {
	const { email, password } = req.body;
	const { user } = await authService.login(email, password);

	// Setear ambas cookies (access + refresh)
	await authService.setAuthCookies(res, user.id);

	res.status(200).json({
		success: true,
		user,
	});
});

export const logout = catchAsync(async (req, res) => {
	// Revocar refresh token en DB si existe
	const refreshTokenJwt = req.cookies.refresh_token;
	await authService.logout(refreshTokenJwt);

	// Limpiar ambas cookies
	authService.clearAuthCookies(res);

	res.status(200).json({
		success: true,
		message: 'Sesión cerrada exitosamente.',
	});
});

/**
 * POST /api/auth/refresh
 *
 * Lee el refresh_token de la cookie httpOnly (path /api/auth),
 * valida contra DB con rotación y detección de reutilización,
 * emite nuevo access + refresh token.
 *
 * El frontend llama este endpoint automáticamente cuando recibe 401.
 */
export const refresh = catchAsync(async (req, res) => {
	const refreshTokenJwt = req.cookies.refresh_token;

	const { user, family } = await authService.refreshSession(refreshTokenJwt);

	// Emitir nuevos tokens en la misma familia (rotación)
	await authService.setAuthCookies(res, user.id, family);

	res.status(200).json({
		success: true,
		user,
	});
});

export const getProfile = catchAsync(async (req, res) => {
	const user = await authService.getProfile(req.user.id);

	res.status(200).json({
		success: true,
		user,
	});
});

export const forgotPassword = catchAsync(async (req, res) => {
	const { email } = req.body;
	const result = await authService.forgotPassword(email);

	res.status(200).json({
		success: true,
		...result,
	});
});

export const resetPassword = catchAsync(async (req, res) => {
	const { token, password } = req.body;
	const result = await authService.resetPassword(token, password);

	// Limpiar cookies (el usuario debe re-loguearse con la nueva contraseña)
	authService.clearAuthCookies(res);

	res.status(200).json({
		success: true,
		...result,
	});
});

export const changePassword = catchAsync(async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

	// Re-emitir tokens (la sesión actual sigue viva, las demás se revocaron)
	await authService.setAuthCookies(res, req.user.id);

	res.status(200).json({
		success: true,
		...result,
	});
});

export const changeEmail = catchAsync(async (req, res) => {
	const { newEmail, password } = req.body;
	const result = await authService.changeEmail(req.user.id, newEmail, password);

	res.status(200).json({
		success: true,
		...result,
	});
});

export const deleteAccount = catchAsync(async (req, res) => {
	const { password } = req.body;
	const result = await authService.deleteAccount(req.user.id, password);

	// Limpiar cookies
	authService.clearAuthCookies(res);

	res.status(200).json({
		success: true,
		...result,
	});
});
