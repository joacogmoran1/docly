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

interface UpdateOfficeScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

interface UpdateProfessionalOfficeInput {
  name?: string;
  address?: string;
  phone?: string;
  appointmentDuration?: number;
  schedule?: UpdateOfficeScheduleInput[];
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
