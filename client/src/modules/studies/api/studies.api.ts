import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import { mapStudyToItem } from "@/services/api/mappers";
import type { ApiStudyListResponse, ApiStudyResponse } from "@/shared/types/api";

interface PatientStudyFilters {
  professionalId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

interface ProfessionalStudyFilters {
  patientId?: string;
}

export async function getStudy(id: string) {
  try {
    const response = await apiClient.get<ApiStudyResponse>(`/studies/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el estudio."));
  }
}

export async function getPatientStudies(patientId: string, filters?: PatientStudyFilters) {
  try {
    const response = await apiClient.get<ApiStudyListResponse>(`/studies/patient/${patientId}`, {
      params: {
        professionalId: filters?.professionalId || undefined,
        type: filters?.type || undefined,
        startDate: filters?.startDate || undefined,
        endDate: filters?.endDate || undefined,
      },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los estudios."));
  }
}

export async function getPatientStudyItems(patientId: string, filters?: PatientStudyFilters) {
  const studies = await getPatientStudies(patientId, filters);
  return studies.map(mapStudyToItem);
}

export async function getProfessionalStudies(
  professionalId: string,
  filters?: ProfessionalStudyFilters,
) {
  try {
    const response = await apiClient.get<ApiStudyListResponse>(
      `/studies/professional/${professionalId}`,
      {
        params: {
          patientId: filters?.patientId || undefined,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar los estudios del profesional."),
    );
  }
}
