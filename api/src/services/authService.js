import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, Patient, Professional, RefreshToken } from '../database/models/index.js';
import PasswordResetToken from '../database/models/PasswordResetToken.js';
import { jwtConfig } from '../config/jwt.js';
import emailService from './emailService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import csrfService from './csrfService.js';

const FALLBACK_PASSWORD_HASH =
	'$2a$12$C6UzMDM.H6dfI/f/IKcEe.FT4G4M0L1C0M6E7mP5B6tQJ1h1uJY6S';

class AuthService {
	// =========================================================================
	// TOKENS
	// =========================================================================

	/**
	 * Access token — corta vida, se envía en cada request vía httpOnly cookie.
	 */
	generateAccessToken(userId) {
		return jwt.sign(
			{ id: userId, type: 'access' },
			jwtConfig.secret,
			{ expiresIn: jwtConfig.accessExpiresIn }
		);
	}

	/**
	 * Refresh token — larga vida, almacenado en DB para revocación.
	 * El jti del JWT coincide con RefreshToken.id en la DB.
	 */
	async generateRefreshToken(userId, family) {
		const tokenFamily = family || crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

		const dbToken = await RefreshToken.create({
			userId,
			family: tokenFamily,
			expiresAt,
		});

		const token = jwt.sign(
			{ id: userId, type: 'refresh', jti: dbToken.id, family: tokenFamily },
			jwtConfig.secret,
			{ expiresIn: jwtConfig.refreshExpiresIn }
		);

		return { token, dbToken };
	}

	/**
	 * Setea ambas cookies (access + refresh) en la response.
	 */
	async setAuthCookies(res, userId, existingFamily) {
		const accessToken = this.generateAccessToken(userId);
		const { token: refreshToken } = await this.generateRefreshToken(userId, existingFamily);

		res.cookie('token', accessToken, jwtConfig.accessCookieOptions);
		res.cookie('refresh_token', refreshToken, jwtConfig.refreshCookieOptions);
		csrfService.issueCookie(res);

		return { accessToken, refreshToken };
	}

	/**
	 * Limpia ambas cookies de auth.
	 */
	clearAuthCookies(res) {
		res.clearCookie('token', {
			path: '/',
			...(jwtConfig.accessCookieOptions.domain ? { domain: jwtConfig.accessCookieOptions.domain } : {}),
		});
		res.clearCookie('refresh_token', {
			path: '/api/auth',
			...(jwtConfig.refreshCookieOptions.domain ? { domain: jwtConfig.refreshCookieOptions.domain } : {}),
		});
		csrfService.clearCookie(res);
	}

	issueCsrfCookie(res) {
		return csrfService.issueCookie(res);
	}

	// =========================================================================
	// REGISTRO
	// =========================================================================

	async register(userData) {
		const { email, password, name, lastName, phone, role, document: dni, acceptedTerms } = userData;

		// Validar aceptación de términos
		if (!acceptedTerms) {
			throw new ApiError(400, 'Debes aceptar los términos y condiciones para registrarte.');
		}

		// Verificar si el usuario ya existe
		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			throw new ApiError(400, 'El email ya está registrado.');
		}

		// Crear usuario con timestamp de aceptación de términos
		const user = await User.create({
			email,
			password,
			name,
			lastName,
			phone,
			role,
			acceptedTermsAt: new Date(),
		});

		// Crear perfil según el rol
		if (role === 'patient') {
			await Patient.create({
				userId: user.id,
				dni: dni || null,
			});
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
				{ association: 'professional', required: false },
				{ association: 'patient', required: false },
			],
		});

		const authenticatedUser = userWithRelations?.toJSON() || user.toJSON();

		return { user: authenticatedUser };
	}

	// =========================================================================
	// LOGIN
	// =========================================================================

	async compareAgainstFallbackPassword(password) {
		await bcrypt.compare(String(password || ''), FALLBACK_PASSWORD_HASH);
	}

	async login(email, password) {
		const user = await User.findOne({
			where: { email },
			include: [
				{ association: 'professional', required: false },
				{ association: 'patient', required: false },
			],
		});

		if (!user || !user.isActive) {
			await this.compareAgainstFallbackPassword(password);
			logger.warn({
				type: 'security',
				event: 'login_failed',
				email,
				reason: 'user_missing_or_inactive',
			});
			throw new ApiError(401, 'Credenciales incorrectas.');
		}

		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			logger.warn({
				type: 'security',
				event: 'login_failed',
				email,
				userId: user.id,
				reason: 'invalid_password',
			});
			throw new ApiError(401, 'Credenciales incorrectas.');
		}

		const authenticatedUser = user.toJSON();

		return { user: authenticatedUser };
	}

	// =========================================================================
	// REFRESH TOKEN
	// =========================================================================

	/**
	 * Valida el refresh token JWT, verifica contra DB, y rota el token.
	 *
	 * Implementa refresh token rotation con detección de reutilización:
	 * - Si el token ya fue revocado → toda la familia se revoca (compromiso detectado).
	 * - Si es válido → se revoca el actual y se emite uno nuevo en la misma familia.
	 */
	async refreshSession(refreshTokenJwt) {
		if (!refreshTokenJwt) {
			throw new ApiError(401, 'No hay refresh token.');
		}

		// Verificar firma y expiración del JWT
		let decoded;
		try {
			decoded = jwt.verify(refreshTokenJwt, jwtConfig.secret);
		} catch (error) {
			throw new ApiError(401, 'Refresh token inválido o expirado.');
		}

		if (decoded.type !== 'refresh' || !decoded.jti) {
			throw new ApiError(401, 'Token inválido.');
		}

		// Buscar en DB
		const dbToken = await RefreshToken.findByPk(decoded.jti);

		if (!dbToken) {
			throw new ApiError(401, 'Refresh token no encontrado.');
		}

		// ── Detección de reutilización ──
		// Si el token ya fue revocado, alguien lo está reutilizando → compromiso.
		if (dbToken.revokedAt) {
			logger.warn(`⚠️ Refresh token reutilizado detectado — revocando familia ${dbToken.family} del usuario ${dbToken.userId}`);
			await RefreshToken.revokeFamily(dbToken.family);
			throw new ApiError(401, 'Sesión comprometida. Inicia sesión nuevamente.');
		}

		// Verificar que no expiró en DB
		if (new Date() > dbToken.expiresAt) {
			await RefreshToken.revokeById(dbToken.id);
			throw new ApiError(401, 'Refresh token expirado.');
		}

		// Verificar que el usuario sigue activo
		const user = await User.findByPk(dbToken.userId, {
			include: [
				{ association: 'professional', required: false },
				{ association: 'patient', required: false },
			],
		});

		if (!user || !user.isActive) {
			await RefreshToken.revokeFamily(dbToken.family);
			throw new ApiError(401, 'Usuario inactivo.');
		}

		// ── Rotación: revocar el actual, emitir nuevo en la misma familia ──
		await RefreshToken.revokeById(dbToken.id);

		return {
			user: user.toJSON(),
			family: dbToken.family,
		};
	}

	// =========================================================================
	// LOGOUT
	// =========================================================================

	async logout(refreshTokenJwt) {
		if (!refreshTokenJwt) return;

		try {
			const decoded = jwt.verify(refreshTokenJwt, jwtConfig.secret);
			if (decoded.jti) {
				const dbToken = await RefreshToken.findByPk(decoded.jti);
				if (dbToken) {
					// Revocar toda la familia (logout del dispositivo)
					await RefreshToken.revokeFamily(dbToken.family);
				}
			}
		} catch {
			// Token ya expirado o inválido — no pasa nada, las cookies se limpian igual.
		}
	}

	// =========================================================================
	// PERFIL
	// =========================================================================

	async getProfile(userId) {
		const user = await User.findByPk(userId, {
			include: [
				{ association: 'professional', required: false },
				{ association: 'patient', required: false },
			],
		});

		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		return user.toJSON();
	}

	// =========================================================================
	// RECUPERACIÓN DE CONTRASEÑA
	// =========================================================================

	async forgotPassword(email) {
		const user = await User.findOne({ where: { email } });

		if (!user) {
			logger.warn({
				type: 'security',
				event: 'password_reset_requested_for_unknown_email',
				email,
			});
			return {
				message: 'Si el email existe, recibirás un enlace de reseteo.',
			};
		}

		const resetToken = await PasswordResetToken.createForUser(user.id);

		try {
			const emailResult = await emailService.sendPasswordResetEmail(user.email, resetToken.token);
			logger.info(`Email de reseteo enviado a ${user.email}`, {
				messageId: emailResult.messageId,
			});
		} catch (emailError) {
			logger.error(`Error enviando email de reseteo a ${user.email}: ${emailError.message}`);
		}

		const response = {
			message: 'Si el email existe, recibirás un enlace de reseteo.',
		};

		if (process.env.NODE_ENV === 'development') {
			response.resetToken = resetToken.token;
			response.resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken.token}`;
		}

		return response;
	}

	async resetPassword(token, newPassword) {
		const tokenHash = PasswordResetToken.hashToken(token);
		const resetToken = await PasswordResetToken.findOne({
			where: { token: tokenHash, used: false },
		});

		if (!resetToken) {
			throw new ApiError(400, 'Token inválido o ya utilizado.');
		}

		if (new Date() > resetToken.expiresAt) {
			throw new ApiError(400, 'El token ha expirado.');
		}

		const user = await User.findByPk(resetToken.userId);
		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		await user.update({ password: newPassword });
		await resetToken.update({ used: true });

		// Revocar todos los refresh tokens del usuario (forzar re-login en todos los dispositivos)
		await RefreshToken.revokeAllForUser(user.id);

		logger.info(`Contraseña reseteada para usuario ${user.id} — refresh tokens revocados`);

		return { message: 'Contraseña actualizada exitosamente. Iniciá sesión con la nueva contraseña.' };
	}

	// =========================================================================
	// CAMBIOS DE CUENTA
	// =========================================================================

	async changePassword(userId, currentPassword, newPassword) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		const isPasswordValid = await user.comparePassword(currentPassword);
		if (!isPasswordValid) {
			throw new ApiError(401, 'Contraseña actual incorrecta.');
		}

		await user.update({ password: newPassword });

		// Revocar todos los refresh tokens (forzar re-login en otros dispositivos)
		await RefreshToken.revokeAllForUser(user.id);

		logger.info(`Contraseña cambiada para usuario ${user.id}`);

		return { message: 'Contraseña cambiada exitosamente.' };
	}

	async changeEmail(userId, newEmail, password) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			throw new ApiError(401, 'Contraseña incorrecta.');
		}

		const existingUser = await User.findOne({ where: { email: newEmail } });
		if (existingUser && existingUser.id !== userId) {
			throw new ApiError(400, 'El email ya está en uso por otra cuenta.');
		}

		const oldEmail = user.email;
		await user.update({ email: newEmail });

		logger.info(`Email cambiado para usuario ${user.id}`);

		try {
			await emailService.sendEmailChangeNotification(oldEmail, newEmail);
		} catch (emailError) {
			logger.error(`Error enviando notificación de cambio de email: ${emailError.message}`);
		}

		return { message: 'Email actualizado exitosamente.' };
	}

	async deleteAccount(userId, password) {
		const user = await User.findByPk(userId);
		if (!user) {
			throw new ApiError(404, 'Usuario no encontrado.');
		}

		const isPasswordValid = await user.comparePassword(password);
		if (!isPasswordValid) {
			throw new ApiError(401, 'Contraseña incorrecta.');
		}

		const userEmail = user.email;

		// Soft delete + revocar todos los refresh tokens
		await user.update({ isActive: false });
		await RefreshToken.revokeAllForUser(user.id);

		logger.info(`Cuenta desactivada para usuario ${user.id}`);

		try {
			await emailService.sendAccountDeletedNotification(userEmail);
		} catch (emailError) {
			logger.error(`Error enviando notificación de eliminación: ${emailError.message}`);
		}

		return { message: 'Cuenta eliminada exitosamente.' };
	}
}

export default new AuthService();
