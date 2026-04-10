import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import type {
  ApiAppointmentListResponse,
  ApiAppointmentResponse,
} from "@/shared/types/api";

interface ProfessionalAppointmentFilters {
  date?: string;
  status?: "scheduled" | "confirmed" | "completed" | "cancelled";
}

interface CreateAppointmentInput {
  patientId: string;
  professionalId: string;
  officeId: string;
  date: string;
  time: string;
  duration?: number;
  reason?: string;
}

export async function getPatientAppointments(patientId: string) {
  try {
    const response = await apiClient.get<ApiAppointmentListResponse>(
      `/appointments/patient/${patientId}`,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los turnos del paciente."));
  }
}

export async function getProfessionalAppointments(
  professionalId: string,
  filters?: ProfessionalAppointmentFilters,
) {
  try {
    const response = await apiClient.get<ApiAppointmentListResponse>(
      `/appointments/professional/${professionalId}`,
      {
        params: filters,
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "No se pudieron cargar los turnos del profesional."),
    );
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  try {
    const response = await apiClient.post<ApiAppointmentResponse>("/appointments", input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el turno."));
  }
}

export async function cancelAppointment(id: string, reason?: string) {
  try {
    const response = await apiClient.post<ApiAppointmentResponse>(
      `/appointments/${id}/cancel`,
      {
        reason,
      },
    );

    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cancelar el turno."));
  }
}
