import { Appointment, Office, PatientProfessional } from '../database/models/index.js';
import officeBlockService from './officeBlockService.js';
import ApiError from '../utils/ApiError.js';
import { Transaction } from 'sequelize';
import sequelize from '../config/database.js';
import { acquireTransactionLock } from '../utils/dbLocks.js';

class AppointmentService {
	async _hasTimeConflict({ date, time, duration, professionalId, officeId, patientId, excludeId, transaction }) {
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

		const [result] = await sequelize.query(
			`
			SELECT id FROM appointments
			WHERE date = :date
			  AND status IN ('pending', 'confirmed')
			  ${whereExtra}
			  AND "time" < (:time::time + :duration * interval '1 minute')
			  AND ("time" + COALESCE(duration, 30) * interval '1 minute') > :time::time
			LIMIT 1
			`,
			{
				replacements,
				type: sequelize.QueryTypes.SELECT,
				transaction,
			}
		);

		return !!result;
	}

	async _findOrFail(appointmentId) {
		const appointment = await Appointment.findByPk(appointmentId);
		if (!appointment) {
			throw new ApiError(404, 'Turno no encontrado.');
		}
		return appointment;
	}

	_buildConflictError(error) {
		if (
			error?.name === 'SequelizeExclusionConstraintError' ||
			error?.original?.code === '23P01' ||
			error?.original?.code === '40001'
		) {
			return new ApiError(
				409,
				'El horario dejó de estar disponible mientras se procesaba la reserva. Intentá nuevamente.'
			);
		}

		return error;
	}

	async create(appointmentData) {
		const { patientId, professionalId, officeId, date, time, duration, reason, createdBy } = appointmentData;
		const transaction = await sequelize.transaction({
			isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
		});

		try {
			await acquireTransactionLock(transaction, 'appointment', officeId, date);
			await acquireTransactionLock(transaction, 'patient-appointment', patientId, date);

			const office = await Office.findByPk(officeId, {
				transaction,
				lock: transaction.LOCK.UPDATE,
			});
			if (!office) {
				throw new ApiError(404, 'Consultorio no encontrado.');
			}

			if (String(office.professionalId) !== String(professionalId)) {
				throw new ApiError(400, 'El consultorio seleccionado no pertenece al profesional indicado.');
			}

			const appointmentDuration = duration || office.appointmentDuration || 30;

			const appointmentDateTime = new Date(`${date}T${time}`);
			if (appointmentDateTime <= new Date()) {
				throw new ApiError(400, 'No se puede agendar un turno en una fecha y hora pasada.');
			}

			const isBlocked = await officeBlockService.isBlocked(officeId, date, time, { transaction });
			if (isBlocked) {
				throw new ApiError(400, 'Este horario no está disponible (bloqueado por el profesional).');
			}

			const professionalConflict = await this._hasTimeConflict({
				date,
				time,
				duration: appointmentDuration,
				professionalId,
				officeId,
				transaction,
			});
			if (professionalConflict) {
				throw new ApiError(400, 'Ya existe un turno que se superpone con ese horario.');
			}

			const patientConflict = await this._hasTimeConflict({
				date,
				time,
				duration: appointmentDuration,
				patientId,
				transaction,
			});
			if (patientConflict) {
				throw new ApiError(400, 'El paciente ya tiene un turno en ese horario.');
			}

			const initialStatus = createdBy === 'patient' ? 'confirmed' : 'pending';

			const appointment = await Appointment.create(
				{
					patientId,
					professionalId,
					officeId,
					date,
					time,
					duration: appointmentDuration,
					reason,
					status: initialStatus,
				},
				{ transaction }
			);

			await PatientProfessional.findOrCreate({
				where: { patientId, professionalId },
				transaction,
			});

			await transaction.commit();

			return await this.getById(appointment.id);
		} catch (error) {
			if (!transaction.finished) {
				await transaction.rollback();
			}
			throw this._buildConflictError(error);
		}
	}

	async confirm(appointmentId) {
		const appointment = await this._findOrFail(appointmentId);

		if (appointment.status !== 'pending') {
			throw new ApiError(400, `No se puede confirmar un turno con estado "${appointment.status}". Solo turnos pendientes.`);
		}

		await appointment.update({ status: 'confirmed' });

		return await this.getById(appointmentId);
	}

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

	async complete(appointmentId) {
		const appointment = await this._findOrFail(appointmentId);

		if (appointment.status !== 'confirmed') {
			throw new ApiError(400, `No se puede completar un turno con estado "${appointment.status}". Solo turnos confirmados.`);
		}

		await appointment.update({ status: 'completed' });

		return await this.getById(appointmentId);
	}

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
