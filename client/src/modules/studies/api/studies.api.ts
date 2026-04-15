import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import { mapStudyToItem } from "@/services/api/mappers";
import type { ApiMessageResponse, ApiStudyListResponse, ApiStudyResponse } from "@/shared/types/api";

interface PatientStudyFilters {
  professionalId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

interface ProfessionalStudyFilters {
  patientId?: string;
}

interface StudyInput {
  patientId: string;
  professionalId?: string | null;
  type: string;
  date: string;
  results?: string;
  fileUrl?: string;
  notes?: string;
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

export async function createStudy(input: StudyInput) {
  try {
    const response = await apiClient.post<ApiStudyResponse>("/studies", input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el estudio."));
  }
}

export async function updateStudy(id: string, input: Partial<StudyInput>) {
  try {
    const response = await apiClient.put<ApiStudyResponse>(`/studies/${id}`, input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo actualizar el estudio."));
  }
}

export async function deleteStudy(id: string) {
  try {
    const response = await apiClient.delete<ApiMessageResponse>(`/studies/${id}`);
    return response.data.message;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar el estudio."));
  }
}
