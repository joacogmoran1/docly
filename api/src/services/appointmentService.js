// src/services/appointmentService.js
import { Appointment, Patient, Professional, Office, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

class AppointmentService {
  async create(appointmentData) {
    const { patientId, professionalId, officeId, date, time, duration, reason } = appointmentData;

    // Verificar que no haya conflicto de horarios
    const existingAppointment = await Appointment.findOne({
      where: {
        professionalId,
        officeId,
        date,
        time,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
      },
    });

    if (existingAppointment) {
      throw new ApiError(400, 'Ya existe un turno en ese horario.');
    }

    const appointment = await Appointment.create({
      patientId,
      professionalId,
      officeId,
      date,
      time,
      duration,
      reason,
      status: 'scheduled',
    });

    return await this.getById(appointment.id);
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
    const appointments = await Appointment.findAll({
      where: { patientId },
      include: [
        {
          association: 'professional',
          include: [{ association: 'user', attributes: ['name', 'lastName'] }],
        },
        { association: 'office' },
      ],
      order: [['date', 'DESC'], ['time', 'DESC']],
    });

    return appointments;
  }

  async getByProfessional(professionalId, filters = {}) {
    const whereClause = { professionalId };

    if (filters.date) {
      whereClause.date = filters.date;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    const appointments = await Appointment.findAll({
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

    return appointments;
  }

  async update(appointmentId, updateData) {
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      throw new ApiError(404, 'Turno no encontrado.');
    }

    const { date, time, status, notes } = updateData;

    await appointment.update({
      date,
      time,
      status,
      notes,
    });

    return await this.getById(appointmentId);
  }

  async cancel(appointmentId, reason) {
    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      throw new ApiError(404, 'Turno no encontrado.');
    }

    await appointment.update({
      status: 'cancelled',
      cancellationReason: reason,
    });

    return await this.getById(appointmentId);
  }
}

export default new AppointmentService();
