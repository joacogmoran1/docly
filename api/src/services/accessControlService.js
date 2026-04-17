import {
	Appointment,
	MedicalRecord,
	Office,
	PatientProfessional,
	Prescription,
	Study,
} from '../database/models/index.js';
import ApiError from '../utils/ApiError.js';

class AccessControlService {
	normalizeId(value) {
		return value == null ? null : String(value);
	}

	getSessionPatientId(user) {
		return this.normalizeId(user?.patient?.id);
	}

	getSessionProfessionalId(user) {
		return this.normalizeId(user?.professional?.id);
	}

	requirePatientSession(user, message = 'Debes iniciar sesión como paciente para realizar esta acción.') {
		const patientId = this.getSessionPatientId(user);
		if (user?.role !== 'patient' || !patientId) {
			throw new ApiError(403, message);
		}
		return patientId;
	}

	requireProfessionalSession(
		user,
		message = 'Debes iniciar sesión como profesional para realizar esta acción.'
	) {
		const professionalId = this.getSessionProfessionalId(user);
		if (user?.role !== 'professional' || !professionalId) {
			throw new ApiError(403, message);
		}
		return professionalId;
	}

	assertPatientSelf(user, patientId, message = 'Solo podés acceder a tus propios datos.') {
		const sessionPatientId = this.requirePatientSession(user);
		if (sessionPatientId !== this.normalizeId(patientId)) {
			throw new ApiError(403, message);
		}
		return sessionPatientId;
	}

	assertProfessionalSelf(
		user,
		professionalId,
		message = 'Solo podés acceder a tus propios datos profesionales.'
	) {
		const sessionProfessionalId = this.requireProfessionalSession(user);
		if (sessionProfessionalId !== this.normalizeId(professionalId)) {
			throw new ApiError(403, message);
		}
		return sessionProfessionalId;
	}

	async hasPatientProfessionalLink(professionalId, patientId) {
		const normalizedProfessionalId = this.normalizeId(professionalId);
		const normalizedPatientId = this.normalizeId(patientId);

		if (!normalizedProfessionalId || !normalizedPatientId) {
			return false;
		}

		const directLink = await PatientProfessional.findOne({
			where: { professionalId: normalizedProfessionalId, patientId: normalizedPatientId },
			attributes: ['patientId'],
		});

		if (directLink) {
			return true;
		}

		const [appointment, medicalRecord, prescription, study] = await Promise.all([
			Appointment.findOne({
				where: { professionalId: normalizedProfessionalId, patientId: normalizedPatientId },
				attributes: ['id'],
			}),
			MedicalRecord.findOne({
				where: { professionalId: normalizedProfessionalId, patientId: normalizedPatientId },
				attributes: ['id'],
			}),
			Prescription.findOne({
				where: { professionalId: normalizedProfessionalId, patientId: normalizedPatientId },
				attributes: ['id'],
			}),
			Study.findOne({
				where: { professionalId: normalizedProfessionalId, patientId: normalizedPatientId },
				attributes: ['id'],
			}),
		]);

		return !!(appointment || medicalRecord || prescription || study);
	}

	async assertProfessionalCanAccessPatient(
		user,
		patientId,
		message = 'No tenés vínculo con este paciente.'
	) {
		const professionalId = this.requireProfessionalSession(user);
		const hasLink = await this.hasPatientProfessionalLink(professionalId, patientId);

		if (!hasLink) {
			throw new ApiError(403, message);
		}

		return professionalId;
	}

	async assertPatientOrLinkedProfessional(
		user,
		patientId,
		patientMessage = 'Solo podés acceder a tus propios datos.',
		professionalMessage = 'No tenés permiso para acceder a los datos de este paciente.'
	) {
		if (user?.role === 'patient') {
			this.assertPatientSelf(user, patientId, patientMessage);
			return { role: 'patient', patientId: this.getSessionPatientId(user) };
		}

		const professionalId = await this.assertProfessionalCanAccessPatient(
			user,
			patientId,
			professionalMessage
		);

		return { role: 'professional', professionalId };
	}

	async getOwnedOffice(
		user,
		officeId,
		message = 'No tenés permiso para administrar este consultorio.'
	) {
		const professionalId = this.requireProfessionalSession(user);
		const office = await Office.findByPk(officeId);

		if (!office) {
			throw new ApiError(404, 'Consultorio no encontrado.');
		}

		if (this.normalizeId(office.professionalId) !== professionalId) {
			throw new ApiError(403, message);
		}

		return office;
	}

	assertAppointmentParticipant(
		user,
		appointment,
		message = 'No tenés permiso para acceder a este turno.'
	) {
		const patientId = this.getSessionPatientId(user);
		const professionalId = this.getSessionProfessionalId(user);

		if (
			this.normalizeId(appointment.patientId) === patientId ||
			this.normalizeId(appointment.professionalId) === professionalId
		) {
			return true;
		}

		throw new ApiError(403, message);
	}

	assertMedicalRecordReadAccess(
		user,
		record,
		message = 'No tenés permiso para acceder a este registro médico.'
	) {
		const patientId = this.getSessionPatientId(user);
		const professionalId = this.getSessionProfessionalId(user);

		if (
			this.normalizeId(record.patientId) === patientId ||
			this.normalizeId(record.professionalId) === professionalId
		) {
			return true;
		}

		throw new ApiError(403, message);
	}

	assertPrescriptionReadAccess(
		user,
		prescription,
		message = 'No tenés permiso para acceder a esta receta.'
	) {
		const patientId = this.getSessionPatientId(user);
		const professionalId = this.getSessionProfessionalId(user);

		if (
			this.normalizeId(prescription.patientId) === patientId ||
			this.normalizeId(prescription.professionalId) === professionalId
		) {
			return true;
		}

		throw new ApiError(403, message);
	}

	async assertStudyReadAccess(
		user,
		study,
		message = 'No tenés permiso para acceder a este estudio.'
	) {
		const patientId = this.getSessionPatientId(user);
		if (this.normalizeId(study.patientId) === patientId) {
			return true;
		}

		const professionalId = this.getSessionProfessionalId(user);
		if (!professionalId) {
			throw new ApiError(403, message);
		}

		if (study.professionalId && this.normalizeId(study.professionalId) === professionalId) {
			return true;
		}

		if (!study.professionalId) {
			const hasLink = await this.hasPatientProfessionalLink(professionalId, study.patientId);
			if (hasLink) {
				return true;
			}
		}

		throw new ApiError(403, message);
	}

	assertStudyWriteAccess(
		user,
		study,
		message = 'No tenés permiso para modificar este estudio.'
	) {
		const patientId = this.getSessionPatientId(user);
		if (this.normalizeId(study.patientId) === patientId && !study.professionalId) {
			return true;
		}

		const professionalId = this.getSessionProfessionalId(user);
		if (professionalId && this.normalizeId(study.professionalId) === professionalId) {
			return true;
		}

		throw new ApiError(403, message);
	}
}

export default new AccessControlService();
