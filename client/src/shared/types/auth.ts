export type Role = "patient" | "professional";

export type Permission =
  | "appointments:read"
  | "appointments:write"
  | "records:read"
  | "records:write"
  | "prescriptions:read"
  | "prescriptions:write"
  | "studies:read"
  | "studies:write"
  | "patients:read"
  | "patients:write"
  | "offices:read"
  | "offices:write"
  | "privacy:read"
  | "privacy:write"
  | "profile:read"
  | "profile:write";

export interface SessionUser {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  subtitle: string;
  avatar: string;
  permissions: Permission[];
  patientId?: string;
  professionalId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
}
