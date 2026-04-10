import type { RouteObject } from "react-router-dom";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { ForgotPasswordPage } from "@/modules/auth/pages/ForgotPasswordPage";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { RegisterPage } from "@/modules/auth/pages/RegisterPage";

export const authRoutes: RouteObject = {
  path: "auth",
  element: <AuthLayout />,
  children: [
    { path: "login", element: <LoginPage /> },
    { path: "register", element: <RegisterPage /> },
    { path: "forgot-password", element: <ForgotPasswordPage /> },
  ],
};
