import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import {
  mapHealthInfoToSections,
  mapOfficeToItem,
  mapPatientProfileToView,
  mapPrescriptionToItem,
  mapProfessionalPatientsToListItems,
  mapProfessionalProfileToView,
  mapStudyToItem,
  mapMedicalRecordToItem,
} from "@/services/api/mappers";
import type {
  ApiOfficeListResponse,
  ApiOfficeBlockListResponse,
  ApiOfficeBlockManyResponse,
  ApiOfficeBlockResponse,
  ApiOfficeResponse,
  ApiProfessionalPatientDetailResponse,
  ApiProfessionalPatientListResponse,
  ApiProfessionalProfileResponse,
} from "@/shared/types/api";

interface UpdateProfessionalProfileInput {
  name?: string;
  lastName?: string;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
  acceptedCoverages?: string[];
  fees?: number;
}

interface ApiProfessionalSignatureResponse {
  success: boolean;
  data: {
    hasSignature: boolean;
    signature: string | null;
  };
}

interface UpdateOfficeScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

interface CreateProfessionalOfficeInput {
  professionalId: string;
  name: string;
  address: string;
  phone?: string;
  appointmentDuration?: number;
  schedule?: UpdateOfficeScheduleInput[];
}

interface UpdateProfessionalOfficeInput {
  name?: string;
  address?: string;
  phone?: string;
  appointmentDuration?: number;
  schedule?: UpdateOfficeScheduleInput[];
}

interface OfficeBlocksFilters {
  startDate?: string;
  endDate?: string;
  date?: string;
}

interface BlockOfficeDayInput {
  date: string;
  reason?: string;
  cancelExisting?: boolean;
}

interface BlockOfficeTimeSlotsInput {
  date: string;
  slots: Array<{
    startTime: string;
    endTime: string;
  }>;
  reason?: string;
  cancelExisting?: boolean;
}

export async function getProfessionalProfile(professionalId: string) {
  try {
    const response = await apiClient.get<ApiProfessionalProfileResponse>(
      `/professionals/${professionalId}`,
    );
    return mapProfessionalProfileToView(response.data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el perfil profesional."));
  }
}

export async function updateProfessionalProfile(
  professionalId: string,
  input: UpdateProfessionalProfileInput,
) {
  try {
    const response = await apiClient.put<ApiProfessionalProfileResponse>(
      `/professionals/${professionalId}`,
      input,
    );
    return mapProfessionalProfileToView(response.data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo guardar el perfil profesional."));
  }
}

export async function getProfessionalSignature(professionalId: string) {
  try {
    const response = await apiClient.get<ApiProfessionalSignatureResponse>(
      `/professionals/${professionalId}/signature`,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la firma digital."));
  }
}

export async function uploadProfessionalSignature(
  professionalId: string,
  signature: string,
) {
  try {
    const response = await apiClient.put<ApiProfessionalSignatureResponse>(
      `/professionals/${professionalId}/signature`,
      { signature },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo guardar la firma digital."));
  }
}

export async function deleteProfessionalSignature(professionalId: string) {
  try {
    const response = await apiClient.delete<ApiProfessionalSignatureResponse>(
      `/professionals/${professionalId}/signature`,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo eliminar la firma digital."));
  }
}

export async function getProfessionalOffices(professionalId: string) {
  try {
    const response = await apiClient.get<ApiOfficeListResponse>(
      `/offices/professional/${professionalId}`,
    );
    return response.data.data.map(mapOfficeToItem);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los consultorios."));
  }
}

export async function createProfessionalOffice(input: CreateProfessionalOfficeInput) {
  try {
    const response = await apiClient.post<ApiOfficeResponse>("/offices", input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear el consultorio."));
  }
}

export async function getProfessionalOfficesData(professionalId: string) {
  try {
    const response = await apiClient.get<ApiOfficeListResponse>(
      `/offices/professional/${professionalId}`,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los consultorios."));
  }
}

export async function getProfessionalOffice(officeId: string) {
  try {
    const response = await apiClient.get<ApiOfficeResponse>(`/offices/${officeId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar el consultorio."));
  }
}

export async function updateProfessionalOffice(
  officeId: string,
  input: UpdateProfessionalOfficeInput,
) {
  try {
    const response = await apiClient.put<ApiOfficeResponse>(`/offices/${officeId}`, input);
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo guardar el consultorio."));
  }
}

export async function getOfficeBlocks(officeId: string, filters?: OfficeBlocksFilters) {
  try {
    const response = await apiClient.get<ApiOfficeBlockListResponse>(`/offices/${officeId}/blocks`, {
      params: {
        startDate: filters?.startDate || undefined,
        endDate: filters?.endDate || undefined,
        date: filters?.date || undefined,
      },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los bloqueos del consultorio."));
  }
}

export async function blockOfficeDay(officeId: string, input: BlockOfficeDayInput) {
  try {
    const response = await apiClient.post<ApiOfficeBlockResponse>(`/offices/${officeId}/blocks/day`, input);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo bloquear el dia."));
  }
}

export async function blockOfficeTimeSlots(officeId: string, input: BlockOfficeTimeSlotsInput) {
  try {
    const response = await apiClient.post<ApiOfficeBlockManyResponse>(
      `/offices/${officeId}/blocks/time-slots`,
      input,
    );
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo bloquear el horario."));
  }
}

export async function unblockOfficeBlock(officeId: string, blockId: string) {
  try {
    await apiClient.delete(`/offices/${officeId}/blocks/${blockId}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo desbloquear el horario."));
  }
}

export async function getProfessionalPatients(professionalId: string) {
  try {
    const response = await apiClient.get<ApiProfessionalPatientListResponse>(
      `/professionals/${professionalId}/patients`,
    );
    return mapProfessionalPatientsToListItems(response.data.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudieron cargar los pacientes."));
  }
}

export async function getProfessionalPatientDetail(professionalId: string, patientId: string) {
  try {
    const response = await apiClient.get<ApiProfessionalPatientDetailResponse>(
      `/professionals/${professionalId}/patients/${patientId}`,
    );
    const data = response.data.data;

    return {
      profile: mapPatientProfileToView(data),
      health: mapHealthInfoToSections(data.healthInfo),
      appointments: data.appointments,
      records: data.medicalRecords.map(mapMedicalRecordToItem),
      studies: data.studies.map(mapStudyToItem),
      prescriptions: data.prescriptions.map(mapPrescriptionToItem),
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cargar la ficha del paciente."));
  }
}
