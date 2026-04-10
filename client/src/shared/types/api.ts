import type { Role } from "@/shared/types/auth";

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export interface ApiUserSummary {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  phone: string | null;
}

export interface ApiPatientSummary {
  id: string;
  userId: string;
  birthDate: string | null;
  gender: "male" | "female" | "other" | null;
  bloodType: string | null;
  medicalCoverage: string | null;
  coverageNumber: string | null;
}

export interface ApiProfessionalSummary {
  id: string;
  userId: string;
  specialty: string;
  licenseNumber: string;
  acceptedCoverages: string[];
  fees: string | null;
}

export interface ApiAuthenticatedUser {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  patient?: ApiPatientSummary | null;
  professional?: ApiProfessionalSummary | null;
}

export interface ApiAuthResponse {
  success: boolean;
  user: ApiAuthenticatedUser;
}

export interface ApiAuthProfileResponse {
  success: boolean;
  user: ApiAuthenticatedUser;
}

export interface ApiHealthInfo {
  id: string;
  patientId: string;
  diseases: string[];
  allergies: string[];
  medications: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPatientProfile {
  id: string;
  userId: string;
  birthDate: string | null;
  gender: "male" | "female" | "other" | null;
  bloodType: string | null;
  medicalCoverage: string | null;
  coverageNumber: string | null;
  createdAt: string;
  updatedAt: string;
  user: ApiUserSummary;
  healthInfo?: ApiHealthInfo | null;
}

export interface ApiPatientProfileResponse {
  success: boolean;
  data: ApiPatientProfile;
}

export interface ApiHealthInfoResponse {
  success: boolean;
  data: ApiHealthInfo;
}

export interface ApiSchedule {
  id?: string;
  officeId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiOffice {
  id: string;
  professionalId: string;
  name: string;
  address: string;
  phone: string | null;
  appointmentDuration: number;
  schedules?: ApiSchedule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiOfficeResponse {
  success: boolean;
  data: ApiOffice;
}

export interface ApiOfficeListResponse {
  success: boolean;
  results: number;
  data: ApiOffice[];
}

export interface ApiProfessionalProfile {
  id: string;
  userId: string;
  specialty: string;
  licenseNumber: string;
  acceptedCoverages: string[];
  fees: string | null;
  user: ApiUserSummary;
  offices?: ApiOffice[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProfessionalProfileResponse {
  success: boolean;
  data: ApiProfessionalProfile;
}

export interface ApiProfessionalListResponse {
  success: boolean;
  results: number;
  data: ApiProfessionalProfile[];
}

export interface ApiAppointmentParty {
  id: string;
  user?: ApiUserSummary;
}

export interface ApiAppointmentOffice {
  id: string;
  name: string;
  address?: string;
  phone?: string | null;
}

export type ApiAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface ApiAppointment {
  id: string;
  patientId: string;
  professionalId: string;
  officeId: string;
  date: string;
  time: string;
  duration: number;
  status: ApiAppointmentStatus;
  reason: string | null;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: ApiAppointmentParty;
  professional?: ApiAppointmentParty;
  office?: ApiAppointmentOffice;
}

export interface ApiAppointmentResponse {
  success: boolean;
  data: ApiAppointment;
}

export interface ApiAppointmentListResponse {
  success: boolean;
  results: number;
  data: ApiAppointment[];
}
