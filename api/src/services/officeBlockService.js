import { OfficeBlock, Office, Appointment } from '../database/models/index.js';
import { Op } from 'sequelize';
import db from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class OfficeBlockService {
    // =========================================================================
    // CONSULTAS
    // =========================================================================

    /**
     * ¿Este horario está bloqueado?
     * Usado por appointmentService.create para rechazar turnos en slots bloqueados.
     */
    async isBlocked(officeId, date, time) {
        const fullDayBlock = await OfficeBlock.findOne({
            where: { officeId, date, type: 'full_day' },
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
        });
        return !!timeRangeBlock;
    }

    /**
     * Listar bloqueos de un consultorio con filtros opcionales.
     */
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

    /**
     * Listar bloqueos de TODOS los consultorios de un profesional.
     * Usado por professionalService.getProfessionalAvailability.
     */
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

    // =========================================================================
    // BLOQUEAR DÍA COMPLETO
    // =========================================================================

    /**
     * Bloquea un día completo. Si cancelExisting=true, cancela turnos del día.
     */
    async blockDay(officeId, { date, reason, cancelExisting = false }) {
        await this._validateOfficeExists(officeId);

        const existing = await OfficeBlock.findOne({
            where: { officeId, date, type: 'full_day' },
        });
        if (existing) {
            throw new ApiError(400, 'Ya existe un bloqueo de día completo para esta fecha.');
        }

        const transaction = await db.transaction();
        try {
            // Reemplazar bloqueos parciales por el de día completo
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

            logger.info(`Día ${date} bloqueado en office ${officeId} (${cancelledAppointments} turnos cancelados)`);
            return { block, cancelledAppointments };
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // BLOQUEAR HORARIOS PUNTUALES
    // =========================================================================

    /**
     * Bloquea uno o varios rangos horarios en una fecha.
     * slots: [{ startTime: "09:00", endTime: "10:00" }, ...]
     */
    async blockTimeSlots(officeId, { date, slots, reason, cancelExisting = false }) {
        await this._validateOfficeExists(officeId);

        if (!slots || !Array.isArray(slots) || slots.length === 0) {
            throw new ApiError(400, 'Se requiere al menos un slot con startTime y endTime.');
        }

        // Verificar que no haya un bloqueo de día completo
        const fullDayBlock = await OfficeBlock.findOne({
            where: { officeId, date, type: 'full_day' },
        });
        if (fullDayBlock) {
            throw new ApiError(400, 'Ya existe un bloqueo de día completo en esta fecha. No se pueden agregar bloqueos parciales.');
        }

        // Validar cada slot
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

            logger.info(`${blocks.length} slot(s) bloqueados en office ${officeId} para ${date} (${cancelledAppointments} turnos cancelados)`);
            return { blocks, cancelledAppointments };
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // ELIMINAR BLOQUEO
    // =========================================================================

    async deleteBlock(officeId, blockId) {
        const block = await OfficeBlock.findOne({
            where: { id: blockId, officeId },
        });
        if (!block) {
            throw new ApiError(404, 'Bloqueo no encontrado.');
        }

        await block.destroy();
        logger.info(`Block ${blockId} eliminado de office ${officeId}`);
        return { success: true };
    }

    // =========================================================================
    // CANCELAR TODOS LOS TURNOS DE UN DÍA (sin bloquear)
    // =========================================================================

    /**
     * Cancela todos los turnos activos de un consultorio en una fecha.
     * No crea bloqueo (para eso usar blockDay con cancelExisting=true).
     */
    async cancelDayAppointments(officeId, { date, reason }) {
        await this._validateOfficeExists(officeId);

        if (!date) {
            throw new ApiError(400, 'La fecha es requerida.');
        }

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
            }
        );

        logger.info(`${cancelledAppointments} turno(s) cancelados en office ${officeId} para ${date}`);
        return { cancelledAppointments };
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    async _validateOfficeExists(officeId) {
        const office = await Office.findByPk(officeId);
        if (!office) throw new ApiError(404, 'Consultorio no encontrado.');
        return office;
    }

    /**
     * Cancela turnos activos dentro de un rango. Si startTime/endTime son null,
     * cancela todos los del día.
     */
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