import type { Role } from "@/shared/types/auth";

export interface LoginFormValues {
  email: string;
  password: string;
  role?: Role;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface RegisterFormValues {
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  document: string;
  specialty?: string;
  license?: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}
