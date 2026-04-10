import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import {
  mapOfficeToItem,
  mapProfessionalProfileToView,
} from "@/services/api/mappers";
import type {
  ApiOfficeListResponse,
  ApiOfficeResponse,
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
