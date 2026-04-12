import {
  loginMock,
  registerMock,
  requestPasswordResetMock,
} from "@/mocks/docly-api";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
} from "@/modules/auth/types/auth-forms";

export function login(values: LoginFormValues) {
  return loginMock(values);
}

export function register(values: RegisterFormValues) {
  return registerMock().then(() => values);
}

export function requestPasswordReset(values: ForgotPasswordFormValues) {
  return requestPasswordResetMock().then(() => values);
}
