import type { SessionUser, Role } from "@/shared/types/auth";
import { rolePermissions } from "@/services/permissions/permissions";

export const sessionUsers: Record<Role, SessionUser> = {
  patient: {
    id: "pat-01",
    role: "patient",
    fullName: "Sofía Martínez",
    email: "sofia@docly.app",
    subtitle: "Cobertura Swiss Medical | Plan SMG20",
    avatar: "SM",
    permissions: rolePermissions.patient,
  },
  professional: {
    id: "pro-01",
    role: "professional",
    fullName: "Dr. Lucas Herrera",
    email: "lucas@docly.app",
    subtitle: "Clínica médica | MP 45122",
    avatar: "LH",
    permissions: rolePermissions.professional,
  },
};
