import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import {
  mapHealthInfoToSections,
  mapMedicalRecordToItem,
  mapPatientAppointmentsToItems,
  mapPatientProfileToView,
  mapPrescriptionToItem,
  mapProfessionalToCard,
  mapStudyToItem,
} from "@/services/api/mappers";
import { getPatientAppointments, getProfessionalAppointments } from "@/modules/appointments/api/appointments.api";
import { getPatientMedicalRecords } from "@/modules/medical-records/api/medical-records.api";
import { getPatientPrescriptions } from "@/modules/prescriptions/api/prescriptions.api";
import { getPatientStudies } from "@/modules/studies/api/studies.api";
import type {
  ApiAppointment,
  ApiHealthInfoResponse,
  ApiPatientProfileResponse,
  ApiProfessionalListResponse,
  ApiProfessionalProfileResponse,
} from "@/shared/types/api";

interface SearchProfessionalsFilters {
  query?: string;
  specialty?: string;
  coverage?: string;
}

interface UpdatePatientProfileInput {
  name?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  bloodType?: string;
  medicalCoverage?: string;
  coverageNumber?: string;
}

export async function getPatientProfile(patientId: string) {
  try {
    const response = await apiClient.get<ApiPatientProfileResponse>(`/patients/${patientId}`);
    return mapPatientProfileToView(response.data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el perfil del paciente."));
  }
}

export async function updatePatientProfile(
  patientId: string,
  input: UpdatePatientProfileInput,
) {
  try {
    const response = await apiClient.put<ApiPatientProfileResponse>(`/patients/${patientId}`, input);
    return mapPatientProfileToView(response.data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo guardar el perfil del paciente."));
  }
}

export async function getPatientHealthInfo(patientId: string) {
  try {
    const response = await apiClient.get<ApiHealthInfoResponse>(`/patients/${patientId}/health`);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la informacion de salud."));
  }
}

export async function getPatientHealthSections(patientId: string) {
  const healthInfo = await getPatientHealthInfo(patientId);
  return mapHealthInfoToSections(healthInfo);
}

export async function getPatientDashboard(patientId: string) {
  const [appointments, prescriptions, studies] = await Promise.all([
    getPatientAppointments(patientId),
    getPatientPrescriptions(patientId, { valid: true }),
    getPatientStudies(patientId),
  ]);

  return {
    appointments: mapPatientAppointmentsToItems(appointments),
    prescriptions: prescriptions.map((item) => ({
      id: item.id,
      medication: item.medications[0]?.name ?? "Receta",
      professionalName: [
        item.professional?.user?.name ?? "Profesional",
        item.professional?.user?.lastName,
      ]
        .filter(Boolean)
        .join(" "),
      date: item.createdAt,
      dose: [item.medications[0]?.dose, item.medications[0]?.frequency]
        .filter(Boolean)
        .join(" | "),
    })),
    studies: studies.map((item) => ({
      id: item.id,
      title: item.type,
      requestedBy: item.professional?.user
        ? [item.professional.user.name, item.professional.user.lastName]
            .filter(Boolean)
            .join(" ")
        : "Paciente",
      date: item.date,
      reportSummary: item.results || item.notes || "Sin resultados cargados.",
    })),
  };
}

export async function getPatientTeamProfessionals(patientId: string) {
  try {
    const response = await apiClient.get<ApiProfessionalListResponse>(
      `/professionals/patients/${patientId}/professionals`,
    );

    return response.data.data.map((professional) =>
      mapProfessionalToCard(professional, { isInTeam: true }),
    );
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar los profesionales del paciente."),
    );
  }
}

export async function searchProfessionals(filters: SearchProfessionalsFilters) {
  try {
    const response = await apiClient.get<ApiProfessionalListResponse>("/professionals/search", {
      params: {
        q: filters.query || undefined,
        specialty: filters.specialty || undefined,
        coverage: filters.coverage || undefined,
      },
    });

    return response.data.data.map((professional) => mapProfessionalToCard(professional));
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo buscar profesionales."));
  }
}

export async function addProfessionalToTeam(patientId: string, professionalId: string) {
  try {
    await apiClient.post(
      `/professionals/patients/${patientId}/professionals/${professionalId}`,
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo agregar el profesional."));
  }
}

export async function removeProfessionalFromTeam(patientId: string, professionalId: string) {
  try {
    await apiClient.delete(
      `/professionals/patients/${patientId}/professionals/${professionalId}`,
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo quitar el profesional."));
  }
}

export async function getPatientProfessionalDetail(
  professionalId: string,
  year: number,
  month: number,
  patientId?: string,
) {
  try {
    const professionalResponse = await apiClient.get<ApiProfessionalProfileResponse>(
      `/professionals/${professionalId}`,
    );
    const appointmentsPromise = getProfessionalAppointments(professionalId).catch(() => [] as ApiAppointment[]);
    const recordsPromise = patientId
      ? getPatientMedicalRecords(patientId, { professionalId }).catch(() => [])
      : Promise.resolve([]);
    const studiesPromise = patientId
      ? getPatientStudies(patientId, { professionalId }).catch(() => [])
      : Promise.resolve([]);
    const prescriptionsPromise = patientId
      ? getPatientPrescriptions(patientId, { professionalId }).catch(() => [])
      : Promise.resolve([]);
    const [appointments, records, studies, prescriptions] = await Promise.all([
      appointmentsPromise,
      recordsPromise,
      studiesPromise,
      prescriptionsPromise,
    ]);

    return {
      professional: professionalResponse.data.data,
      appointments,
      records: records.map(mapMedicalRecordToItem),
      studies: studies.map(mapStudyToItem),
      prescriptions: prescriptions.map(mapPrescriptionToItem),
      year,
      month,
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el profesional."));
  }
}
