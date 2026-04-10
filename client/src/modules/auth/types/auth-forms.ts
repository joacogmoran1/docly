export interface LoginFormValues {
  email: string;
  password: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface RegisterFormValues {
  role: "patient" | "professional";
  fullName: string;
  email: string;
  phone: string;
  specialty?: string;
  license?: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}
