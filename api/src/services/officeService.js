import { Office, Schedule, Appointment } from '../database/models/index.js';
import db from '../config/database.js';

class OfficeService {
    /**
     * Crear consultorio con schedules
     */
    async create(data) {
        const { schedule, ...officeData } = data;

        // Iniciar transacción
        const transaction = await db.transaction();

        try {
            // 1. Crear office
            const office = await Office.create(officeData, { transaction });

            console.log('✅ Office creado:', office.id);

            // 2. Crear schedules si existen
            if (schedule && Array.isArray(schedule) && schedule.length > 0) {
                const schedulesToCreate = schedule.map(s => ({
                    officeId: office.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isActive: s.isActive !== false, // Default true
                }));

                await Schedule.bulkCreate(schedulesToCreate, { transaction });

                console.log('✅ Schedules creados:', schedulesToCreate.length);
            }

            // 3. Commit transaction
            await transaction.commit();

            // 4. Retornar office con schedules
            const officeWithSchedules = await Office.findByPk(office.id, {
                include: [
                    {
                        model: Schedule,
                        as: 'schedules',
                        order: [['dayOfWeek', 'ASC']],
                    },
                ],
            });

            return officeWithSchedules;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error creando office:', error);
            throw error;
        }
    }

    /**
     * Obtener consultorio por ID con schedules
     */
    async getById(id) {
        const office = await Office.findByPk(id, {
            include: [
                {
                    model: Schedule,
                    as: 'schedules',
                    order: [['dayOfWeek', 'ASC']],
                },
            ],
        });

        return office;
    }

    /**
     * Obtener consultorios de un profesional
     */
    async getByProfessional(professionalId) {
        const offices = await Office.findAll({
            where: { professionalId },
            include: [
                {
                    model: Schedule,
                    as: 'schedules',
                    order: [['dayOfWeek', 'ASC']],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        return offices;
    }

    /**
     * Actualizar consultorio y schedules
     */
    async update(id, data) {
        const { schedule, ...officeData } = data;

        // Iniciar transacción
        const transaction = await db.transaction();

        try {
            // 1. Actualizar datos del office
            const office = await Office.findByPk(id);

            if (!office) {
                throw new Error('Consultorio no encontrado');
            }

            await office.update(officeData, { transaction });

            console.log('✅ Office actualizado:', office.id);

            // 2. Actualizar schedules si se enviaron
            if (schedule && Array.isArray(schedule)) {
                // ESTRATEGIA: Eliminar todos los schedules existentes y crear los nuevos
                // Esto es más simple y evita conflictos

                // 2.1 Eliminar schedules existentes
                await Schedule.destroy({
                    where: { officeId: id },
                    transaction,
                });

                console.log('🗑️ Schedules antiguos eliminados');

                // 2.2 Crear nuevos schedules
                if (schedule.length > 0) {
                    const schedulesToCreate = schedule.map(s => ({
                        officeId: id,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isActive: s.isActive !== false,
                    }));

                    await Schedule.bulkCreate(schedulesToCreate, { transaction });

                    console.log('✅ Schedules nuevos creados:', schedulesToCreate.length);
                }
            }

            // 3. Commit transaction
            await transaction.commit();

            // 4. Retornar office actualizado con schedules
            const officeWithSchedules = await Office.findByPk(id, {
                include: [
                    {
                        model: Schedule,
                        as: 'schedules',
                        order: [['dayOfWeek', 'ASC']],
                    },
                ],
            });

            return officeWithSchedules;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error actualizando office:', error);
            throw error;
        }
    }

    /**
     * Eliminar consultorio (cascade delete)
     */
    async delete(id) {
        // Iniciar transacción
        const transaction = await db.transaction();

        try {
            const office = await Office.findByPk(id);

            if (!office) {
                throw new Error('Consultorio no encontrado');
            }

            // 1. Eliminar appointments (si el modelo no tiene cascade)
            const deletedAppointments = await Appointment.destroy({
                where: { officeId: id },
                transaction,
            });

            console.log('🗑️ Appointments eliminados:', deletedAppointments);

            // 2. Eliminar schedules (si el modelo no tiene cascade)
            const deletedSchedules = await Schedule.destroy({
                where: { officeId: id },
                transaction,
            });

            console.log('🗑️ Schedules eliminados:', deletedSchedules);

            // 3. Eliminar office
            await office.destroy({ transaction });

            console.log('🗑️ Office eliminado:', id);

            // 4. Commit transaction
            await transaction.commit();

            return { success: true };
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error eliminando office:', error);
            throw error;
        }
    }
}

export const officeService = new OfficeService();