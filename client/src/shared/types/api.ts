import type { Role } from "@/shared/types/auth";

export interface ApiMessageResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  resetLink?: string;
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
  | "pending"
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

export interface ApiPrescriptionMedication {
  name: string;
  dose: string;
  frequency?: string | null;
  duration?: string | null;
}

export interface ApiPrescription {
  id: string;
  patientId: string;
  professionalId: string;
  medications: ApiPrescriptionMedication[];
  diagnosis: string | null;
  instructions: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: ApiAppointmentParty;
  professional?: ApiAppointmentParty;
}

export interface ApiPrescriptionResponse {
  success: boolean;
  data: ApiPrescription;
}

export interface ApiPrescriptionListResponse {
  success: boolean;
  results: number;
  data: ApiPrescription[];
}

export interface ApiStudy {
  id: string;
  patientId: string;
  professionalId: string | null;
  type: string;
  date: string;
  results: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: ApiAppointmentParty;
  professional?: ApiAppointmentParty | null;
}

export interface ApiStudyResponse {
  success: boolean;
  data: ApiStudy;
}

export interface ApiStudyListResponse {
  success: boolean;
  results: number;
  data: ApiStudy[];
}

export interface ApiVitalSigns {
  bloodPressure?: string | null;
  heartRate?: number | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
}

export interface ApiMedicalRecord {
  id: string;
  patientId: string;
  professionalId: string;
  appointmentId: string | null;
  date: string;
  reason: string;
  diagnosis: string;
  indications: string;
  evolution: string | null;
  nextCheckup: string | null;
  vitalSigns: ApiVitalSigns;
  createdAt: string;
  updatedAt: string;
  patient?: ApiAppointmentParty;
  professional?: ApiAppointmentParty & {
    user?: ApiUserSummary & {
      specialty?: string | null;
    };
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
  } | null;
}

export interface ApiMedicalRecordResponse {
  success: boolean;
  data: ApiMedicalRecord;
}

export interface ApiMedicalRecordListResponse {
  success: boolean;
  results: number;
  data: ApiMedicalRecord[];
}

export interface ApiProfessionalPatientStats {
  totalAppointments: number;
  totalRecords: number;
  totalPrescriptions: number;
  lastAppointmentDate: string | null;
  lastAppointmentStatus: ApiAppointmentStatus | null;
}

export interface ApiProfessionalPatientListItem extends ApiPatientProfile {
  stats: ApiProfessionalPatientStats;
}

export interface ApiProfessionalPatientListResponse {
  success: boolean;
  results: number;
  data: ApiProfessionalPatientListItem[];
}

export interface ApiProfessionalPatientDetail extends ApiPatientProfile {
  healthInfo: ApiHealthInfo | null;
  medicalRecords: ApiMedicalRecord[];
  prescriptions: ApiPrescription[];
  studies: ApiStudy[];
  appointments: ApiAppointment[];
}

export interface ApiProfessionalPatientDetailResponse {
  success: boolean;
  data: ApiProfessionalPatientDetail;
}

export interface ApiProfessionalAvailabilityResponse {
  success: boolean;
  data: {
    offices: ApiOffice[];
    appointments: Array<{
      id: string;
      officeId: string;
      date: string;
      time: string;
      duration: number;
    }>;
    blocks: ApiOfficeBlock[];
  };
}

export interface ApiOfficeBlock {
  id: string;
  officeId: string;
  date: string;
  type: "full_day" | "time_range";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiOfficeBlockResponse {
  success: boolean;
  data: ApiOfficeBlock;
  cancelledAppointments?: number;
}

export interface ApiOfficeBlockListResponse {
  success: boolean;
  results: number;
  data: ApiOfficeBlock[];
}

export interface ApiOfficeBlockManyResponse {
  success: boolean;
  data: ApiOfficeBlock[];
  cancelledAppointments?: number;
}
