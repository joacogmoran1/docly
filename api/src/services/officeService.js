import { Office, Schedule, Appointment, OfficeBlock } from '../database/models/index.js';
import db from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class OfficeService {
    async create(data) {
        const { schedule, ...officeData } = data;
        const transaction = await db.transaction();

        try {
            const office = await Office.create(officeData, { transaction });

            if (schedule && Array.isArray(schedule) && schedule.length > 0) {
                const schedulesToCreate = schedule.map(s => ({
                    officeId: office.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isActive: s.isActive !== false,
                }));
                await Schedule.bulkCreate(schedulesToCreate, { transaction });
            }

            await transaction.commit();

            return await this._findWithSchedules(office.id);
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            logger.error(`Error creando office: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    async getById(id) {
        const office = await this._findWithSchedules(id);
        if (!office) throw new ApiError(404, 'Consultorio no encontrado.');
        return office;
    }

    async getByProfessional(professionalId) {
        return await Office.findAll({
            where: { professionalId },
            include: [{
                model: Schedule,
                as: 'schedules',
                order: [['dayOfWeek', 'ASC']],
            }],
            order: [['createdAt', 'DESC']],
        });
    }

    async update(id, data) {
        const { schedule, ...officeData } = data;
        const transaction = await db.transaction();

        try {
            const office = await Office.findByPk(id);
            if (!office) {
                await transaction.rollback();
                throw new ApiError(404, 'Consultorio no encontrado.');
            }

            await office.update(officeData, { transaction });

            if (schedule && Array.isArray(schedule)) {
                await Schedule.destroy({ where: { officeId: id }, transaction });

                if (schedule.length > 0) {
                    const schedulesToCreate = schedule.map(s => ({
                        officeId: id,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isActive: s.isActive !== false,
                    }));
                    await Schedule.bulkCreate(schedulesToCreate, { transaction });
                }
            }

            await transaction.commit();
            return await this._findWithSchedules(id);
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            logger.error(`Error actualizando office: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    async delete(id) {
        const transaction = await db.transaction();

        try {
            const office = await Office.findByPk(id);
            if (!office) {
                await transaction.rollback();
                throw new ApiError(404, 'Consultorio no encontrado.');
            }

            await Appointment.destroy({ where: { officeId: id }, transaction });
            await Schedule.destroy({ where: { officeId: id }, transaction });
            await OfficeBlock.destroy({ where: { officeId: id }, transaction });
            await office.destroy({ transaction });

            await transaction.commit();
            logger.info(`Office ${id} eliminado con datos asociados`);
            return { success: true };
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            logger.error(`Error eliminando office: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    // Helper reutilizable
    async _findWithSchedules(id) {
        return await Office.findByPk(id, {
            include: [{
                model: Schedule,
                as: 'schedules',
                order: [['dayOfWeek', 'ASC']],
            }],
        });
    }
}

export const officeService = new OfficeService();