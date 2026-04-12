import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { hasPermission } from "@/services/permissions/permissions";
import type { Permission } from "@/shared/types/auth";

interface PermissionGuardProps {
  permission: Permission;
}

export function PermissionGuard({ permission }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!hasPermission(user.permissions, permission)) {
    return <Navigate to={user.role === "patient" ? "/patient" : "/professional"} replace />;
  }

  return <Outlet />;
}
