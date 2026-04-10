import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

export function AuthGuard() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <div className="centered-feedback">Cargando sesión…</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
