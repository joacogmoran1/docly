export interface LoginFormValues {
  email: string;
  password: string;
  role?: "patient" | "professional";
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RegisterFormValues {
  role: "patient" | "professional";
  fullName: string;
  email: string;
  phone: string;
  document?: string;
  specialty?: string;
  license?: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}
