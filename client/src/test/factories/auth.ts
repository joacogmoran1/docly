import { rolePermissions } from "@/services/permissions/permissions";
import type { Role, SessionUser } from "@/shared/types/auth";

export function createSessionUser(
  overrides: Partial<SessionUser> & { role?: Role } = {},
): SessionUser {
  const role = overrides.role ?? "patient";

  const baseUser: SessionUser =
    role === "patient"
      ? {
          id: "patient-user-1",
          role,
          fullName: "Paciente Demo",
          email: "patient@docly.app",
          subtitle: "Cobertura demo",
          avatar: "PD",
          permissions: [...rolePermissions.patient],
          patientId: "patient-1",
          firstName: "Paciente",
          lastName: "Demo",
          phone: "+54 11 5555 0001",
        }
      : {
          id: "professional-user-1",
          role,
          fullName: "Profesional Demo",
          email: "doctor@docly.app",
          subtitle: "Clinica medica | MP 1234",
          avatar: "MD",
          permissions: [...rolePermissions.professional],
          professionalId: "professional-1",
          firstName: "Profesional",
          lastName: "Demo",
          phone: "+54 11 5555 0002",
        };

  return {
    ...baseUser,
    ...overrides,
    role,
    permissions: overrides.permissions ?? [...rolePermissions[role]],
  };
}
