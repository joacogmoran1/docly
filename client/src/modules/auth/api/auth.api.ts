import { apiClient } from "@/services/api/client";
import { getApiErrorMessage } from "@/services/api/errors";
import { mapApiUserToSessionUser } from "@/services/api/mappers";
import type {
  ApiAuthProfileResponse,
  ApiAuthResponse,
  ApiMessageResponse,
} from "@/shared/types/api";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
} from "@/modules/auth/types/auth-forms";

function splitFullName(fullName: string) {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const [name, ...lastNameParts] = trimmed.split(" ");

  return {
    name,
    lastName: lastNameParts.join(" ") || undefined,
  };
}

export async function login(values: LoginFormValues) {
  try {
    const response = await apiClient.post<ApiAuthResponse>("/auth/login", {
      email: values.email,
      password: values.password,
    });

    return mapApiUserToSessionUser(response.data.user);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo iniciar sesion."));
  }
}

export async function register(values: RegisterFormValues) {
  try {
    const { name, lastName } = splitFullName(values.fullName);
    const response = await apiClient.post<ApiAuthResponse>("/auth/register", {
      email: values.email,
      password: values.password,
      name,
      lastName,
      phone: values.phone || undefined,
      role: values.role,
      specialty: values.role === "professional" ? values.specialty : undefined,
      licenseNumber: values.role === "professional" ? values.license : undefined,
    });

    return mapApiUserToSessionUser(response.data.user);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo crear la cuenta."));
  }
}

export async function getCurrentSessionUser() {
  try {
    const response = await apiClient.get<ApiAuthProfileResponse>("/auth/profile", {
      skipSessionClear: true,
    } as never);

    return mapApiUserToSessionUser(response.data.user);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo restaurar la sesion."));
  }
}

export async function logout() {
  try {
    await apiClient.post<ApiMessageResponse>("/auth/logout");
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo cerrar la sesion."));
  }
}

export async function requestPasswordReset(_values: ForgotPasswordFormValues) {
  throw new Error("El backend actual no expone recuperacion de contrasena.");
}
