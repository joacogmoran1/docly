import { Navigate, createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "@/app/guards/AuthGuard";
import { authRoutes } from "@/app/router/auth.routes";
import { patientRoutes } from "@/app/router/patient.routes";
import { professionalRoutes } from "@/app/router/professional.routes";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  authRoutes,
  {
    element: <AuthGuard />,
    children: [patientRoutes, professionalRoutes],
  },
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },
]);
