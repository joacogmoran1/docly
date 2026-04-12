import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import { mapMedicalRecordToItem } from "@/services/api/mappers";
import type {
  ApiMedicalRecordListResponse,
  ApiMedicalRecordResponse,
  ApiVitalSigns,
} from "@/shared/types/api";

interface PatientMedicalRecordFilters {
  professionalId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface ProfessionalMedicalRecordFilters {
  patientId?: string;
  date?: string;
}

interface CreateMedicalRecordInput {
  patientId: string;
  professionalId: string;
  appointmentId?: string;
  date?: string;
  diagnosis: string;
  treatment?: string;
  notes?: string;
  vitalSigns?: ApiVitalSigns;
}

export async function getMedicalRecord(id: string) {
  try {
    const response = await apiClient.get<ApiMedicalRecordResponse>(`/medical-records/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el registro medico."));
  }
}

export async function getPatientMedicalRecords(
  patientId: string,
  filters?: PatientMedicalRecordFilters,
) {
  try {
    const response = await apiClient.get<ApiMedicalRecordListResponse>(
      `/medical-records/patient/${patientId}`,
      {
        params: {
          professionalId: filters?.professionalId || undefined,
          startDate: filters?.startDate || undefined,
          endDate: filters?.endDate || undefined,
          search: filters?.search || undefined,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los registros medicos."));
  }
}

export async function getPatientMedicalRecordItems(
  patientId: string,
  filters?: PatientMedicalRecordFilters,
) {
  const records = await getPatientMedicalRecords(patientId, filters);
  return records.map(mapMedicalRecordToItem);
}

export async function getProfessionalMedicalRecords(
  professionalId: string,
  filters?: ProfessionalMedicalRecordFilters,
) {
  try {
    const response = await apiClient.get<ApiMedicalRecordListResponse>(
      `/medical-records/professional/${professionalId}`,
      {
        params: {
          patientId: filters?.patientId || undefined,
          date: filters?.date || undefined,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar los registros del profesional."),
    );
  }
}

export async function createMedicalRecord(input: CreateMedicalRecordInput) {
  try {
    const response = await apiClient.post<ApiMedicalRecordResponse>("/medical-records", input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el registro medico."));
  }
}
