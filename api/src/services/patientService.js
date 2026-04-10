// src/services/patientService.js
import { Patient, HealthInfo, User } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';

class PatientService {
  async getProfile(patientId) {
    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'email', 'name', 'lastName', 'phone'],
        },
        { association: 'healthInfo' },
      ],
    });

    if (!patient) {
      throw new ApiError(404, 'Paciente no encontrado.');
    }

    return patient;
  }

  async updateProfile(patientId, updateData) {
    const patient = await Patient.findByPk(patientId);
    
    if (!patient) {
      throw new ApiError(404, 'Paciente no encontrado.');
    }

    // Actualizar datos del paciente
    const { birthDate, gender, bloodType, medicalCoverage, coverageNumber } = updateData;
    
    await patient.update({
      birthDate,
      gender,
      bloodType,
      medicalCoverage,
      coverageNumber,
    });

    // Si hay datos del usuario (nombre, teléfono, etc.)
    if (updateData.name || updateData.lastName || updateData.phone) {
      await User.update(
        {
          name: updateData.name,
          lastName: updateData.lastName,
          phone: updateData.phone,
        },
        { where: { id: patient.userId } }
      );
    }

    return await this.getProfile(patientId);
  }

  async getHealthInfo(patientId) {
    let healthInfo = await HealthInfo.findOne({ where: { patientId } });

    // Si no existe, crear uno vacío
    if (!healthInfo) {
      healthInfo = await HealthInfo.create({ patientId });
    }

    return healthInfo;
  }

  async updateHealthInfo(patientId, healthData) {
    const { diseases, allergies, medications, notes } = healthData;

    let healthInfo = await HealthInfo.findOne({ where: { patientId } });

    if (healthInfo) {
      await healthInfo.update({ diseases, allergies, medications, notes });
    } else {
      healthInfo = await HealthInfo.create({
        patientId,
        diseases,
        allergies,
        medications,
        notes,
      });
    }

    return healthInfo;
  }
}

export default new PatientService();
