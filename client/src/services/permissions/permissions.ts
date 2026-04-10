import type { Permission, Role } from "@/shared/types/auth";

export const rolePermissions: Record<Role, Permission[]> = {
  patient: [
    "appointments:read",
    "appointments:write",
    "records:read",
    "prescriptions:read",
    "studies:read",
    "profile:read",
    "profile:write",
    "privacy:read",
    "privacy:write",
  ],
  professional: [
    "appointments:read",
    "appointments:write",
    "records:read",
    "records:write",
    "prescriptions:read",
    "prescriptions:write",
    "studies:read",
    "patients:read",
    "patients:write",
    "offices:read",
    "offices:write",
    "profile:read",
    "profile:write",
    "privacy:read",
  ],
};

export function hasPermission(
  permissions: Permission[],
  requiredPermission: Permission,
) {
  return permissions.includes(requiredPermission);
}
