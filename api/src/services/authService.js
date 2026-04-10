import jwt from 'jsonwebtoken';
import { User, Patient, Professional } from '../database/models/index.js';
import PasswordResetToken from '../database/models/PasswordResetToken.js';
import { jwtConfig } from '../config/jwt.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AuthService {
	generateToken(userId) {
		return jwt.sign({ id: userId }, jwtConfig.secret, {
			expiresIn: jwtConfig.expiresIn,
		});
	}

	async register(userData) {
		const { email, password, name, lastName, phone, role } = userData;

		// Verificar si el usuario ya existe
		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			throw new ApiError(400, 'El email ya está registrado.');
		}

		// Crear usuario
		const user = await User.create({
			email,
			password,
			name,
			lastName,
			phone,
			role,
		});

		// Crear perfil según el rol
		if (role === 'patient') {
			await Patient.create({ userId: user.id });
		} else if (role === 'professional') {
			const { specialty, licenseNumber } = userData;

			if (!specialty || !licenseNumber) {
				throw new ApiError(400, 'Especialidad y matrícula son requeridos para profesionales.');
			}

			await Professional.create({
				userId: user.id,
				specialty,
				licenseNumber,
			});
		}

		// Recargar usuario con relaciones
		const userWithRelations = await User.findByPk(user.id, {
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

		const token = this.generateToken(user.id);

		return { user: userWithRelations, token };
	}

	async login(email, password) {
		// Buscar usuario con relaciones
		const user = await User.findOne({
			where: { email },
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
			throw new ApiError(401, 'Credenciales incorrectas.');
		}

		// Verificar password
		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			throw new ApiError(401, 'Credenciales incorrectas.');
		}

		const token = this.generateToken(user.id);

		return { user, token };
	}

	async getProfile(userId) {
		const user = await User.findByPk(userId, {
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

		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		return user;
	}

	async forgotPassword(email) {
		const user = await User.findOne({ where: { email } });

		if (!user) {
			// No revelamos si el email existe o no por seguridad
			logger.info(`Intento de reseteo de password para email no existente: ${email}`);
			return {
				message: 'Si el email existe, recibirás un enlace de reseteo.',
			};
		}

		// Crear token de reseteo
		const resetToken = await PasswordResetToken.createForUser(user.id);

		// En producción, aquí se enviaría un email con el link
		// Para desarrollo, devolvemos el token
		logger.info(`Token de reseteo generado para usuario ${user.id}: ${resetToken.token}`);

		// TODO: Implementar envío de email
		// await emailService.sendPasswordResetEmail(user.email, resetToken.token);

		return {
			message: 'Si el email existe, recibirás un enlace de reseteo.',
			// Solo en desarrollo:
			...(process.env.NODE_ENV === 'development' && { 
				resetToken: resetToken.token,
				resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken.token}`,
			}),
		};
	}

	async resetPassword(token, newPassword) {
		// Buscar token válido
		const resetToken = await PasswordResetToken.findOne({
			where: {
				token,
				used: false,
			},
		});

		if (!resetToken) {
			throw new ApiError(400, 'Token inválido o ya utilizado.');
		}

		// Verificar expiración
		if (new Date() > resetToken.expiresAt) {
			throw new ApiError(400, 'El token ha expirado.');
		}

		// Actualizar contraseña
		const user = await User.findByPk(resetToken.userId);

		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		// El hook beforeUpdate de User hasheará la contraseña
		await user.update({ password: newPassword });

		// Marcar token como usado
		await resetToken.update({ used: true });

		logger.info(`Contraseña reseteada exitosamente para usuario ${user.id}`);

		return {
			message: 'Contraseña actualizada exitosamente.',
		};
	}

	async changePassword(userId, currentPassword, newPassword) {
		const user = await User.findByPk(userId);

		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		// Verificar contraseña actual
		const isPasswordValid = await user.comparePassword(currentPassword);

		if (!isPasswordValid) {
			throw new ApiError(401, 'Contraseña actual incorrecta.');
		}

		// Actualizar contraseña
		await user.update({ password: newPassword });

		logger.info(`Contraseña cambiada exitosamente para usuario ${user.id}`);

		return {
			message: 'Contraseña cambiada exitosamente.',
		};
	}
}

export default new AuthService();
