import jwt from 'jsonwebtoken';
import { User, Patient, Professional } from '../database/models/index.js';
import { jwtConfig } from '../config/jwt.js';
import ApiError from '../utils/ApiError.js';

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

		// ✅ CORREGIDO: Recargar usuario con relaciones
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
		// ✅ CORREGIDO: Buscar usuario CON las relaciones
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
}

export default new AuthService();