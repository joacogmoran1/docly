import { Professional, User, PatientProfessional } from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';
import { Op } from 'sequelize';

class ProfessionalService {
  async search(query, filters = {}) {
    const { specialty, coverage } = filters;
    
    const whereClause = {};
    
    if (specialty) {
      whereClause.specialty = { [Op.iLike]: `%${specialty}%` };
    }
    
    if (coverage) {
      whereClause.acceptedCoverages = { [Op.contains]: [coverage] };
    }

    const professionals = await Professional.findAll({
      where: whereClause,
      include: [
        {
          association: 'user',
          attributes: ['id', 'email', 'name', 'lastName', 'phone'],
          where: query
            ? {
                [Op.or]: [
                  { name: { [Op.iLike]: `%${query}%` } },
                  { lastName: { [Op.iLike]: `%${query}%` } },
                ],
              }
            : {},
        },
      ],
    });

    return professionals;
  }

  async getById(professionalId) {
    const professional = await Professional.findByPk(professionalId, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'email', 'name', 'lastName', 'phone'],
        },
        { association: 'offices' },
      ],
    });

    if (!professional) {
      throw new ApiError(404, 'Profesional no encontrado.');
    }

    return professional;
  }

  async updateProfile(professionalId, updateData) {
    const professional = await Professional.findByPk(professionalId);
    
    if (!professional) {
      throw new ApiError(404, 'Profesional no encontrado.');
    }

    const { specialty, licenseNumber, acceptedCoverages, fees } = updateData;
    
    await professional.update({
      specialty,
      licenseNumber,
      acceptedCoverages,
      fees,
    });

    // Actualizar datos del usuario si vienen
    if (updateData.name || updateData.lastName || updateData.phone) {
      await User.update(
        {
          name: updateData.name,
          lastName: updateData.lastName,
          phone: updateData.phone,
        },
        { where: { id: professional.userId } }
      );
    }

    return await this.getById(professionalId);
  }

  async addToPatientTeam(patientId, professionalId) {
    const [relationship, created] = await PatientProfessional.findOrCreate({
      where: { patientId, professionalId },
    });

    if (!created) {
      throw new ApiError(400, 'Este profesional ya está en tu equipo.');
    }

    return relationship;
  }

  async removeFromPatientTeam(patientId, professionalId) {
    const deleted = await PatientProfessional.destroy({
      where: { patientId, professionalId },
    });

    if (!deleted) {
      throw new ApiError(404, 'Relación no encontrada.');
    }

    return { success: true };
  }

  async getPatientProfessionals(patientId) {
    const professionals = await Professional.findAll({
      include: [
        {
          association: 'patients',
          where: { id: patientId },
          attributes: [],
        },
        {
          association: 'user',
          attributes: ['id', 'name', 'lastName', 'email', 'phone'],
        },
      ],
    });

    return professionals;
  }
}

export default new ProfessionalService();
