import authService from '../services/authService.js';
import { jwtConfig } from '../config/jwt.js';
import catchAsync from '../utils/catchAsync.js';

export const register = catchAsync(async (req, res) => {
	const { user, token } = await authService.register(req.body);

	// 🔒 Establecer cookie httpOnly
	res.cookie('token', token, jwtConfig.cookieOptions);

	res.status(201).json({
		success: true,
		user,
	});
});

export const login = catchAsync(async (req, res) => {
	const { email, password } = req.body;
	const { user, token } = await authService.login(email, password);

	// 🔒 Establecer cookie httpOnly
	res.cookie('token', token, jwtConfig.cookieOptions);

	res.status(200).json({
		success: true,
		user,
	});
});

export const logout = catchAsync(async (req, res) => {
	// 🔒 Limpiar cookie
	res.clearCookie('token');

	res.status(200).json({
		success: true,
		message: 'Sesión cerrada exitosamente.',
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

	res.status(200).json({
		success: true,
		...result,
	});
});

export const changePassword = catchAsync(async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

	res.status(200).json({
		success: true,
		...result,
	});
});
