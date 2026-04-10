import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import { User } from '../database/models/index.js';

export const protect = catchAsync(async (req, res, next) => {
	// 🔒 Leer token de la cookie httpOnly
	const token = req.cookies.token;

	if (!token) {
		throw new ApiError(401, 'No estás autenticado. Por favor inicia sesión.');
	}

	// Verificar token
	let decoded;
	try {
		decoded = jwt.verify(token, jwtConfig.secret);
	} catch (error) {
		throw new ApiError(401, 'Token inválido o expirado.');
	}

	// ✅ CORREGIDO: Verificar que el usuario existe y cargar relaciones
	const user = await User.findByPk(decoded.id, {
		include: [
			{
				association: 'professional',
				required: false,
			},
			{
				association: 'patient',
				required: false,
			},
		],
	});

	if (!user || !user.isActive) {
		throw new ApiError(401, 'El usuario ya no existe o está inactivo.');
	}

	// Adjuntar usuario al request
	req.user = user;
	next();
});

export const restrictTo = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			throw new ApiError(403, 'No tienes permiso para realizar esta acción.');
		}
		next();
	};
};