import { OfficeBlock, Office, Appointment } from '../database/models/index.js';
import { Op } from 'sequelize';
import db from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { acquireTransactionLock } from '../utils/dbLocks.js';

class OfficeBlockService {
	async isBlocked(officeId, date, time, options = {}) {
		const { transaction } = options;
		const fullDayBlock = await OfficeBlock.findOne({
			where: { officeId, date, type: 'full_day' },
			transaction,
		});
		if (fullDayBlock) return true;

		const timeRangeBlock = await OfficeBlock.findOne({
			where: {
				officeId,
				date,
				type: 'time_range',
				startTime: { [Op.lte]: time },
				endTime: { [Op.gt]: time },
			},
			transaction,
		});
		return !!timeRangeBlock;
	}

	async getByOffice(officeId, filters = {}) {
		const whereClause = { officeId };

		if (filters.startDate && filters.endDate) {
			whereClause.date = { [Op.between]: [filters.startDate, filters.endDate] };
		} else if (filters.startDate) {
			whereClause.date = { [Op.gte]: filters.startDate };
		} else if (filters.date) {
			whereClause.date = filters.date;
		}

		return await OfficeBlock.findAll({
			where: whereClause,
			order: [['date', 'ASC'], ['start_time', 'ASC']],
		});
	}

	async getByProfessional(professionalId, filters = {}) {
		const offices = await Office.findAll({
			where: { professionalId },
			attributes: ['id'],
		});
		const officeIds = offices.map(o => o.id);
		if (officeIds.length === 0) return [];

		const whereClause = { officeId: { [Op.in]: officeIds } };

		if (filters.startDate && filters.endDate) {
			whereClause.date = { [Op.between]: [filters.startDate, filters.endDate] };
		} else if (filters.startDate) {
			whereClause.date = { [Op.gte]: filters.startDate };
		}

		return await OfficeBlock.findAll({
			where: whereClause,
			order: [['date', 'ASC'], ['start_time', 'ASC']],
		});
	}

	_buildConflictError(error) {
		if (
			error?.name === 'SequelizeExclusionConstraintError' ||
			error?.original?.code === '23P01' ||
			error?.original?.code === '40001'
		) {
			return new ApiError(
				409,
				'El bloqueo se superpone con otro horario o hubo una operación concurrente. Intentá nuevamente.'
			);
		}

		return error;
	}

	async blockDay(officeId, { date, reason, cancelExisting = false }) {
		await this._validateOfficeExists(officeId);

		const transaction = await db.transaction();
		try {
			await acquireTransactionLock(transaction, 'appointment', officeId, date);

			const existing = await OfficeBlock.findOne({
				where: { officeId, date, type: 'full_day' },
				transaction,
			});
			if (existing) {
				throw new ApiError(400, 'Ya existe un bloqueo de día completo para esta fecha.');
			}

			await OfficeBlock.destroy({
				where: { officeId, date },
				transaction,
			});

			const block = await OfficeBlock.create({
				officeId,
				date,
				type: 'full_day',
				reason: reason || 'Día bloqueado',
			}, { transaction });

			let cancelledAppointments = 0;
			if (cancelExisting) {
				cancelledAppointments = await this._cancelAppointments(
					officeId, date, null, null, reason, transaction
				);
			}

			await transaction.commit();

			logger.info({ message: 'Día bloqueado.', officeId, date, cancelledAppointments });
			return { block, cancelledAppointments };
		} catch (error) {
			if (!transaction.finished) await transaction.rollback();
			throw this._buildConflictError(error);
		}
	}

	async blockTimeSlots(officeId, { date, slots, reason, cancelExisting = false }) {
		await this._validateOfficeExists(officeId);

		if (!slots || !Array.isArray(slots) || slots.length === 0) {
			throw new ApiError(400, 'Se requiere al menos un slot con startTime y endTime.');
		}

		for (const slot of slots) {
			if (!slot.startTime || !slot.endTime) {
				throw new ApiError(400, 'Cada slot debe tener startTime y endTime.');
			}
			if (slot.startTime >= slot.endTime) {
				throw new ApiError(400, `startTime (${slot.startTime}) debe ser anterior a endTime (${slot.endTime}).`);
			}
		}

		const transaction = await db.transaction();
		try {
			await acquireTransactionLock(transaction, 'appointment', officeId, date);

			const fullDayBlock = await OfficeBlock.findOne({
				where: { officeId, date, type: 'full_day' },
				transaction,
			});
			if (fullDayBlock) {
				throw new ApiError(400, 'Ya existe un bloqueo de día completo en esta fecha. No se pueden agregar bloqueos parciales.');
			}

			const blocks = [];
			let cancelledAppointments = 0;

			for (const slot of slots) {
				const block = await OfficeBlock.create({
					officeId,
					date,
					type: 'time_range',
					startTime: slot.startTime,
					endTime: slot.endTime,
					reason: reason || 'Horario bloqueado',
				}, { transaction });

				blocks.push(block);

				if (cancelExisting) {
					cancelledAppointments += await this._cancelAppointments(
						officeId, date, slot.startTime, slot.endTime, reason, transaction
					);
				}
			}

			await transaction.commit();

			logger.info({ message: 'Slots bloqueados.', officeId, date, cancelledAppointments, count: blocks.length });
			return { blocks, cancelledAppointments };
		} catch (error) {
			if (!transaction.finished) await transaction.rollback();
			throw this._buildConflictError(error);
		}
	}

	async deleteBlock(officeId, blockId) {
		const block = await OfficeBlock.findOne({
			where: { id: blockId, officeId },
		});
		if (!block) {
			throw new ApiError(404, 'Bloqueo no encontrado.');
		}

		await block.destroy();
		logger.info({ message: 'Bloqueo eliminado.', officeId, blockId });
		return { success: true };
	}

	async cancelDayAppointments(officeId, { date, reason }) {
		await this._validateOfficeExists(officeId);

		if (!date) {
			throw new ApiError(400, 'La fecha es requerida.');
		}

		const transaction = await db.transaction();
		try {
			await acquireTransactionLock(transaction, 'appointment', officeId, date);

			const [cancelledAppointments] = await Appointment.update(
				{
					status: 'cancelled',
					cancellationReason: reason || 'Cancelación del día por el profesional',
				},
				{
					where: {
						officeId,
						date,
						status: { [Op.in]: ['pending', 'confirmed'] },
					},
					transaction,
				}
			);

			await transaction.commit();
			logger.info({ message: 'Turnos del día cancelados.', officeId, date, cancelledAppointments });
			return { cancelledAppointments };
		} catch (error) {
			if (!transaction.finished) await transaction.rollback();
			throw this._buildConflictError(error);
		}
	}

	async _validateOfficeExists(officeId) {
		const office = await Office.findByPk(officeId);
		if (!office) throw new ApiError(404, 'Consultorio no encontrado.');
		return office;
	}

	async _cancelAppointments(officeId, date, startTime, endTime, reason, transaction) {
		const where = {
			officeId,
			date,
			status: { [Op.in]: ['pending', 'confirmed'] },
		};

		if (startTime && endTime) {
			where.time = { [Op.gte]: startTime, [Op.lt]: endTime };
		}

		const [count] = await Appointment.update(
			{
				status: 'cancelled',
				cancellationReason: reason || 'Cancelado por bloqueo de horario',
			},
			{ where, transaction }
		);

		return count;
	}
}

export default new OfficeBlockService();
