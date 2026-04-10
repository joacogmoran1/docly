import type { Role } from "@/shared/types/auth";
import { sessionUsers } from "@/mocks/auth";
import {
  patientAppointmentsMock,
  patientHealthMock,
  patientPrescriptionsMock,
  patientProfessionalAgendaMock,
  patientProfessionalsMock,
  patientProfileMock,
  patientRecordsMock,
  patientSettingsMock,
  patientStudiesMock,
} from "@/mocks/patient";
import {
  professionalAgendaMock,
  professionalOfficesMock,
  professionalPatientDetailsMock,
  professionalPatientsMock,
  professionalPrescriptionTemplatesMock,
  professionalPrescriptionsMock,
  professionalProfileMock,
  professionalSettingsMock,
  professionalStudiesMock,
} from "@/mocks/professional";

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginMock({
  email,
  password,
  role,
}: {
  email: string;
  password: string;
  role?: Role;
}) {
  await wait();

  if (!email || !password) {
    throw new Error("Ingresa credenciales validas.");
  }

  const resolvedRole = role ?? (email.includes("doctor") ? "professional" : "patient");
  const user = sessionUsers[resolvedRole];

  return {
    user,
    tokens: {
      accessToken: `mock-access-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      expiresAt: "2026-12-31T23:59:59.000Z",
    },
  };
}

export async function registerMock() {
  await wait();
  return { success: true };
}

export async function requestPasswordResetMock() {
  await wait();
  return { success: true };
}

export async function getSessionUserById(userId: string, role: Role) {
  await wait(150);
  const user = sessionUsers[role];
  return user.id === userId ? user : null;
}

export async function getPatientDashboardMock() {
  await wait();
  return {
    appointments: patientAppointmentsMock,
    prescriptions: patientPrescriptionsMock,
    studies: patientStudiesMock,
  };
}

export async function getPatientProfessionalsMock() {
  await wait();
  return patientProfessionalsMock;
}

export async function getPatientProfessionalDetailMock(id: string) {
  await wait();
  const professional = patientProfessionalsMock.find((item) => item.id === id) ?? null;
  if (!professional) return null;

  return {
    professional,
    agenda: patientProfessionalAgendaMock[id] ?? [],
    records: patientRecordsMock,
    prescriptions: patientPrescriptionsMock,
  };
}

export async function getPatientAppointmentsMock() {
  await wait();
  return patientAppointmentsMock;
}

export async function getPatientHealthMock() {
  await wait();
  return patientHealthMock;
}

export async function getPatientStudiesMock() {
  await wait();
  return patientStudiesMock;
}

export async function getPatientPrescriptionsMock() {
  await wait();
  return patientPrescriptionsMock;
}

export async function getPatientProfileMock() {
  await wait();
  return patientProfileMock;
}

export async function getPatientSettingsMock() {
  await wait();
  return patientSettingsMock;
}

export async function getProfessionalDashboardMock(officeId?: string) {
  await wait();
  const selected = officeId && officeId !== "all"
    ? professionalAgendaMock.filter((item) => item.officeId === officeId)
    : professionalAgendaMock;

  const todayItems = selected.filter((item) => item.date === "2026-04-08");
  const patientIds = todayItems
    .flatMap((item) => item.bookedSlots)
    .map((item) => item.patientId)
    .filter((value): value is string => Boolean(value));

  return {
    todayAgenda: todayItems.flatMap((item) => item.bookedSlots),
    todayPatients: professionalPatientsMock.filter((patient) =>
      patientIds.includes(patient.id),
    ),
  };
}

export async function getProfessionalPatientsMock() {
  await wait();
  return professionalPatientsMock;
}

export async function getProfessionalPatientDetailMock(id: string) {
  await wait();
  return professionalPatientDetailsMock[id as keyof typeof professionalPatientDetailsMock] ?? null;
}

export async function getProfessionalScheduleMock() {
  await wait();
  return professionalAgendaMock;
}

export async function getProfessionalPrescriptionsMock() {
  await wait();
  return {
    prescriptions: professionalPrescriptionsMock,
    templates: professionalPrescriptionTemplatesMock,
    patients: professionalPatientsMock,
  };
}

export async function getProfessionalOfficesMock() {
  await wait();
  return professionalOfficesMock;
}

export async function getProfessionalOfficeDetailMock(id: string) {
  await wait();
  const office = professionalOfficesMock.find((item) => item.id === id) ?? null;
  if (!office) return null;

  return {
    office,
    agenda: professionalAgendaMock.filter((day) => day.officeId === id),
  };
}

export async function getProfessionalProfileMock() {
  await wait();
  return professionalProfileMock;
}

export async function getProfessionalSettingsMock() {
  await wait();
  return professionalSettingsMock;
}

export async function getProfessionalStudiesMock() {
  await wait();
  return professionalStudiesMock;
}
