// src/services/appointmentService.js
import { Appointment, Patient, Professional, Office, User } from '../database/models/index.js';
import officeBlockService from './officeBlockService.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Estados válidos y transiciones:
 *
 *   pending ──→ confirmed ──→ completed
 *     │              │
 *     └──→ cancelled ←┘
 *
 * pending:   profesional agenda → paciente debe responder
 * confirmed: paciente aceptó
 * completed: consulta finalizada (profesional)
 * cancelled: cancelado por cualquiera
 */

// Estados que ocupan un slot (bloquean horario)
const ACTIVE_STATUSES = ['pending', 'confirmed'];

class AppointmentService {
	// =========================================================================
	// HELPERS
	// =========================================================================

	async _hasTimeConflict({ date, time, duration, professionalId, officeId, patientId, excludeId }) {
		let whereExtra = '';
		const replacements = { date, time, duration };

		if (professionalId && officeId) {
			whereExtra = 'AND professional_id = :professionalId AND office_id = :officeId';
			replacements.professionalId = professionalId;
			replacements.officeId = officeId;
		} else if (patientId) {
			whereExtra = 'AND patient_id = :patientId';
			replacements.patientId = patientId;
		}

		if (excludeId) {
			whereExtra += ' AND id != :excludeId';
			replacements.excludeId = excludeId;
		}

		const [results] = await sequelize.query(
			`
			SELECT id FROM appointments
			WHERE date = :date
			  AND status IN ('pending', 'confirmed')
			  ${whereExtra}
			  AND "time" < (:time::time + :duration * interval '1 minute')
			  AND ("time" + COALESCE(duration, 30) * interval '1 minute') > :time::time
			LIMIT 1
			`,
			{ replacements, type: sequelize.QueryTypes.SELECT }
		);

		return !!results;
	}

	async _findOrFail(appointmentId) {
		const appointment = await Appointment.findByPk(appointmentId);
		if (!appointment) {
			throw new ApiError(404, 'Turno no encontrado.');
		}
		return appointment;
	}

	// =========================================================================
	// CREAR TURNO
	// - createdBy 'professional' → status 'pending' (paciente debe confirmar)
	// - createdBy 'patient'      → status 'confirmed' (el paciente ya eligió)
	// =========================================================================

	async create(appointmentData) {
		const { patientId, professionalId, officeId, date, time, duration, reason, createdBy } = appointmentData;

		const office = await Office.findByPk(officeId);
		if (!office) {
			throw new ApiError(404, 'Consultorio no encontrado.');
		}

		const appointmentDuration = duration || office.appointmentDuration || 30;

		// No agendar en el pasado
		const appointmentDateTime = new Date(`${date}T${time}`);
		if (appointmentDateTime <= new Date()) {
			throw new ApiError(400, 'No se puede agendar un turno en una fecha y hora pasada.');
		}

		// No agendar en horario bloqueado
		const isBlocked = await officeBlockService.isBlocked(officeId, date, time);
		if (isBlocked) {
			throw new ApiError(400, 'Este horario no está disponible (bloqueado por el profesional).');
		}

		// No solapar con turnos del profesional
		const professionalConflict = await this._hasTimeConflict({
			date, time, duration: appointmentDuration, professionalId, officeId,
		});
		if (professionalConflict) {
			throw new ApiError(400, 'Ya existe un turno que se superpone con ese horario.');
		}

		// No solapar con turnos del paciente
		const patientConflict = await this._hasTimeConflict({
			date, time, duration: appointmentDuration, patientId,
		});
		if (patientConflict) {
			throw new ApiError(400, 'El paciente ya tiene un turno en ese horario.');
		}

		// Determinar estado inicial según quién agenda
		const initialStatus = createdBy === 'patient' ? 'confirmed' : 'pending';

		const appointment = await Appointment.create({
			patientId,
			professionalId,
			officeId,
			date,
			time,
			duration: appointmentDuration,
			reason,
			status: initialStatus,
		});

		return await this.getById(appointment.id);
	}

	// =========================================================================
	// CONFIRMAR TURNO (paciente acepta → 'pending' → 'confirmed')
	// =========================================================================

	async confirm(appointmentId) {
		const appointment = await this._findOrFail(appointmentId);

		if (appointment.status !== 'pending') {
			throw new ApiError(400, `No se puede confirmar un turno con estado "${appointment.status}". Solo turnos pendientes.`);
		}

		await appointment.update({ status: 'confirmed' });

		return await this.getById(appointmentId);
	}

	// =========================================================================
	// CANCELAR TURNO (cualquier parte → 'pending'|'confirmed' → 'cancelled')
	// =========================================================================

	async cancel(appointmentId, reason) {
		const appointment = await this._findOrFail(appointmentId);

		if (appointment.status === 'completed') {
			throw new ApiError(400, 'No se puede cancelar un turno ya completado.');
		}

		if (appointment.status === 'cancelled') {
			throw new ApiError(400, 'El turno ya está cancelado.');
		}

		await appointment.update({
			status: 'cancelled',
			cancellationReason: reason,
		});

		return await this.getById(appointmentId);
	}

	// =========================================================================
	// COMPLETAR TURNO (profesional cierra → 'confirmed' → 'completed')
	// =========================================================================

	async complete(appointmentId) {
		const appointment = await this._findOrFail(appointmentId);

		if (appointment.status !== 'confirmed') {
			throw new ApiError(400, `No se puede completar un turno con estado "${appointment.status}". Solo turnos confirmados.`);
		}

		await appointment.update({ status: 'completed' });

		return await this.getById(appointmentId);
	}

	// =========================================================================
	// REPROGRAMAR (profesional cambia fecha/hora → vuelve a 'pending')
	// =========================================================================

	async reschedule(appointmentId, { date, time }) {
		const appointment = await this._findOrFail(appointmentId);

		if (['completed', 'cancelled'].includes(appointment.status)) {
			throw new ApiError(400, `No se puede reprogramar un turno con estado "${appointment.status}".`);
		}

		const newDate = date || appointment.date;
		const newTime = time || appointment.time;
		const dur = appointment.duration || 30;

		// No reprogramar al pasado
		const newDateTime = new Date(`${newDate}T${newTime}`);
		if (newDateTime <= new Date()) {
			throw new ApiError(400, 'No se puede reprogramar un turno a una fecha y hora pasada.');
		}

		// Verificar bloqueo
		const isBlocked = await officeBlockService.isBlocked(appointment.officeId, newDate, newTime);
		if (isBlocked) {
			throw new ApiError(400, 'El nuevo horario no está disponible (bloqueado).');
		}

		// Verificar solapamiento
		const conflict = await this._hasTimeConflict({
			date: newDate,
			time: newTime,
			duration: dur,
			professionalId: appointment.professionalId,
			officeId: appointment.officeId,
			excludeId: appointmentId,
		});
		if (conflict) {
			throw new ApiError(400, 'Ya existe un turno que se superpone con el nuevo horario.');
		}

		// Reprogramar → vuelve a pending, el paciente debe re-confirmar
		await appointment.update({
			date: newDate,
			time: newTime,
			status: 'pending',
		});

		return await this.getById(appointmentId);
	}

	// =========================================================================
	// LECTURAS
	// =========================================================================

	async getById(appointmentId) {
		const appointment = await Appointment.findByPk(appointmentId, {
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName', 'email', 'phone'] }],
				},
				{
					association: 'professional',
					attributes: { exclude: ['signature'] },
					include: [{ association: 'user', attributes: ['name', 'lastName', 'email'] }],
				},
				{ association: 'office' },
			],
		});

		if (!appointment) {
			throw new ApiError(404, 'Turno no encontrado.');
		}

		return appointment;
	}

	async getByPatient(patientId) {
		return await Appointment.findAll({
			where: { patientId },
			include: [
				{
					association: 'professional',
					attributes: { exclude: ['signature'] },
					include: [{ association: 'user', attributes: ['name', 'lastName'] }],
				},
				{ association: 'office' },
			],
			order: [['date', 'DESC'], ['time', 'DESC']],
		});
	}

	async getByProfessional(professionalId, filters = {}) {
		const whereClause = { professionalId };

		if (filters.date) whereClause.date = filters.date;
		if (filters.status) whereClause.status = filters.status;
		if (filters.officeId) whereClause.officeId = filters.officeId;

		return await Appointment.findAll({
			where: whereClause,
			include: [
				{
					association: 'patient',
					include: [{ association: 'user', attributes: ['name', 'lastName', 'phone'] }],
				},
				{ association: 'office' },
			],
			order: [['date', 'ASC'], ['time', 'ASC']],
		});
	}
}

export default new AppointmentService();