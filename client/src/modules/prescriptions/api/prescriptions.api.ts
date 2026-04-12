import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import type {
  ApiPrescriptionListResponse,
  ApiPrescriptionMedication,
  ApiPrescriptionResponse,
} from "@/shared/types/api";

interface PatientPrescriptionFilters {
  professionalId?: string;
  valid?: boolean;
  search?: string;
}

interface ProfessionalPrescriptionFilters {
  patientId?: string;
}

interface CreatePrescriptionInput {
  patientId: string;
  professionalId: string;
  medications: ApiPrescriptionMedication[];
  diagnosis?: string;
  instructions?: string;
  validUntil?: string;
}

export async function getPrescription(id: string) {
  try {
    const response = await apiClient.get<ApiPrescriptionResponse>(`/prescriptions/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la receta."));
  }
}

export async function getPatientPrescriptions(
  patientId: string,
  filters?: PatientPrescriptionFilters,
) {
  try {
    const response = await apiClient.get<ApiPrescriptionListResponse>(
      `/prescriptions/patient/${patientId}`,
      {
        params: {
          professionalId: filters?.professionalId || undefined,
          valid: filters?.valid ? "true" : undefined,
          search: filters?.search || undefined,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar las recetas."));
  }
}

export async function getPatientPrescriptionItems(
  patientId: string,
  filters?: PatientPrescriptionFilters,
) {
  const prescriptions = await getPatientPrescriptions(patientId, filters);
  return prescriptions.map(mapPrescriptionToItem);
}

export async function getProfessionalPrescriptions(
  professionalId: string,
  filters?: ProfessionalPrescriptionFilters,
) {
  try {
    const response = await apiClient.get<ApiPrescriptionListResponse>(
      `/prescriptions/professional/${professionalId}`,
      {
        params: {
          patientId: filters?.patientId || undefined,
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar las recetas del profesional."),
    );
  }
}

export async function createPrescription(input: CreatePrescriptionInput) {
  try {
    const response = await apiClient.post<ApiPrescriptionResponse>("/prescriptions", input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la receta."));
  }
}
