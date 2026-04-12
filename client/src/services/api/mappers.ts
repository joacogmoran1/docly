import { rolePermissions } from "@/services/permissions/permissions";
import type {
  ApiAppointment,
  ApiAppointmentStatus,
  ApiAuthenticatedUser,
  ApiHealthInfo,
  ApiMedicalRecord,
  ApiOffice,
  ApiPrescription,
  ApiProfessionalPatientListItem,
  ApiProfessionalProfile,
  ApiStudy,
} from "@/shared/types/api";
import type {
  AgendaDay,
  AppointmentItem,
  HealthSection,
  MedicalRecordItem,
  OfficeItem,
  PatientListItem,
  PrescriptionItem,
  ProfessionalCard,
  ScheduleEvent,
  StudyItem,
} from "@/shared/types/domain";
import type { Permission, SessionUser } from "@/shared/types/auth";

export interface PatientProfileView {
  patientId: string;
  userId: string;
  name: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  bloodType: string;
  coverage: string;
  coverageNumber: string;
}

export interface ProfessionalProfileView {
  professionalId: string;
  userId: string;
  name: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  acceptedCoverages: string[];
  acceptedCoveragesLabel: string;
  fees: string;
}

export interface AppointmentPatientOption {
  id: string;
  fullName: string;
  meta: string;
}

export interface PasswordResetView {
  message: string;
  resetToken?: string;
  resetLink?: string;
}

const weekdayLabels = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function safeText(value: string | null | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function buildFullName(name: string, lastName?: string | null) {
  return [name, lastName].filter(Boolean).join(" ").trim();
}

function buildInitials(name: string, lastName?: string | null) {
  const source = [name, lastName].filter(Boolean).join(" ").trim();
  if (!source) return "DL";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapRoleSubtitle(user: ApiAuthenticatedUser) {
  if (user.role === "patient") {
    const coverage = user.patient?.medicalCoverage ?? "Sin cobertura";
    const coverageNumber = user.patient?.coverageNumber;
    return coverageNumber ? `${coverage} | Nro ${coverageNumber}` : coverage;
  }

  const specialty = user.professional?.specialty ?? "Profesional";
  const license = user.professional?.licenseNumber;
  return license ? `${specialty} | ${license}` : specialty;
}

export function mapApiUserToSessionUser(user: ApiAuthenticatedUser): SessionUser {
  return {
    id: user.id,
    role: user.role,
    fullName: buildFullName(user.name, user.lastName),
    email: user.email,
    subtitle: mapRoleSubtitle(user),
    avatar: buildInitials(user.name, user.lastName),
    permissions: rolePermissions[user.role] as Permission[],
    patientId: user.patient?.id,
    professionalId: user.professional?.id,
    firstName: user.name,
    lastName: safeText(user.lastName),
    phone: safeText(user.phone),
  };
}

export function mapPatientProfileToView(profile: {
  id: string;
  userId: string;
  birthDate: string | null;
  gender: string | null;
  bloodType: string | null;
  medicalCoverage: string | null;
  coverageNumber: string | null;
  user: { name: string; lastName: string | null; email: string; phone: string | null };
}): PatientProfileView {
  return {
    patientId: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    lastName: safeText(profile.user.lastName),
    fullName: buildFullName(profile.user.name, profile.user.lastName),
    email: profile.user.email,
    phone: safeText(profile.user.phone),
    birthDate: safeText(profile.birthDate),
    gender: safeText(profile.gender),
    bloodType: safeText(profile.bloodType),
    coverage: safeText(profile.medicalCoverage),
    coverageNumber: safeText(profile.coverageNumber),
  };
}

export function mapProfessionalProfileToView(profile: ApiProfessionalProfile): ProfessionalProfileView {
  return {
    professionalId: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    lastName: safeText(profile.user.lastName),
    fullName: buildFullName(profile.user.name, profile.user.lastName),
    email: profile.user.email,
    phone: safeText(profile.user.phone),
    specialty: profile.specialty,
    licenseNumber: profile.licenseNumber,
    acceptedCoverages: profile.acceptedCoverages ?? [],
    acceptedCoveragesLabel: (profile.acceptedCoverages ?? []).join(", "),
    fees: safeText(profile.fees),
  };
}

export function mapHealthInfoToSections(healthInfo: ApiHealthInfo | null): HealthSection[] {
  if (!healthInfo) {
    return [
      {
        id: "summary",
        title: "Informacion de salud",
        items: ["Todavia no hay informacion registrada."],
        updatedAt: new Date().toISOString(),
        privacy: "Disponible solo para vos y tus profesionales autorizados.",
      },
    ];
  }

  const updatedAt = healthInfo.updatedAt;

  return [
    {
      id: "diseases",
      title: "Enfermedades",
      items: healthInfo.diseases.length ? healthInfo.diseases : ["Sin enfermedades registradas."],
      updatedAt,
      privacy: "Visible para profesionales autorizados.",
    },
    {
      id: "allergies",
      title: "Alergias",
      items: healthInfo.allergies.length ? healthInfo.allergies : ["Sin alergias registradas."],
      updatedAt,
      privacy: "Visible para profesionales autorizados.",
    },
    {
      id: "medications",
      title: "Medicacion actual",
      items: healthInfo.medications.length ? healthInfo.medications : ["Sin medicacion registrada."],
      updatedAt,
      privacy: "Visible para profesionales autorizados.",
    },
    {
      id: "notes",
      title: "Notas",
      items: healthInfo.notes ? [healthInfo.notes] : ["Sin notas registradas."],
      updatedAt,
      privacy: "Uso clinico compartido con tu equipo medico.",
    },
  ];
}

export function mapApiAppointmentStatus(status: ApiAppointmentStatus): AppointmentItem["status"] {
  if (status === "confirmed" || status === "completed") return "Confirmado";
  if (status === "cancelled") return "Cancelado";
  return "Pendiente";
}

export function toDateTimeIso(date: string, time: string) {
  const normalizedTime = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date}T${normalizedTime}:00`;
}

export function mapPatientAppointmentsToItems(appointments: ApiAppointment[]): AppointmentItem[] {
  return appointments.map((appointment) => ({
    id: appointment.id,
    professionalName: buildFullName(
      appointment.professional?.user?.name ?? "Profesional",
      appointment.professional?.user?.lastName,
    ),
    specialty: appointment.reason ?? "Consulta",
    date: toDateTimeIso(appointment.date, appointment.time),
    office: appointment.office?.name ?? "Consultorio",
    status: mapApiAppointmentStatus(appointment.status),
    type: "Presencial",
  }));
}

export function mapProfessionalToCard(
  professional: ApiProfessionalProfile,
  options?: {
    isInTeam?: boolean;
  },
): ProfessionalCard {
  const officeAddresses = professional.offices?.map((office) => office.address).filter(Boolean) ?? [];
  return {
    id: professional.id,
    fullName: buildFullName(professional.user.name, professional.user.lastName),
    specialty: professional.specialty,
    coverage: professional.acceptedCoverages ?? [],
    location: officeAddresses[0] ?? "Sin consultorio registrado",
    offices:
      professional.offices?.map((office) => ({
        id: office.id,
        name: office.name,
      })) ?? [],
    nextAvailable: "Consultar agenda",
    isInTeam: options?.isInTeam ?? false,
    bio: professional.fees ? `Honorarios desde $${professional.fees}` : `Matricula ${professional.licenseNumber}`,
  };
}

export function mapOfficeToItem(office: ApiOffice): OfficeItem {
  const weeklyRules = (office.schedules ?? [])
    .filter((schedule) => schedule.isActive)
    .map((schedule) => ({
      day: weekdayLabels[schedule.dayOfWeek] ?? "Dia",
      hours: `${normalizeTime(schedule.startTime)} / ${normalizeTime(schedule.endTime)}`,
      duration: `${office.appointmentDuration} min`,
    }));

  return {
    id: office.id,
    name: office.name,
    address: office.address,
    notes: office.phone ? `Telefono: ${office.phone}` : "Sin telefono registrado.",
    days: weeklyRules.map((rule) => rule.day).join(", "),
    schedule: weeklyRules.map((rule) => rule.hours).join(" | "),
    appointmentDuration: `${office.appointmentDuration} min`,
    weeklyRules,
    blockedDates: [],
    blockedTimes: [],
  };
}

export function mapAppointmentToScheduleEvent(appointment: ApiAppointment): ScheduleEvent {
  return {
    id: appointment.id,
    officeId: appointment.officeId,
    patientId: appointment.patientId,
    patientName: buildFullName(
      appointment.patient?.user?.name ?? "Paciente",
      appointment.patient?.user?.lastName,
    ),
    officeName: appointment.office?.name ?? "Consultorio",
    date: toDateTimeIso(appointment.date, appointment.time),
    status:
      appointment.status === "cancelled"
        ? "Cancelado"
        : appointment.status === "confirmed" || appointment.status === "completed"
          ? "Confirmado"
          : "Pendiente",
    reason: appointment.reason ?? "Consulta",
  };
}

function buildTimeSlots(startTime: string, endTime: string, durationMinutes: number) {
  const result: string[] = [];
  const [startHours, startMinutes] = normalizeTime(startTime).split(":").map(Number);
  const [endHours, endMinutes] = normalizeTime(endTime).split(":").map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;

  for (let current = start; current + durationMinutes <= end; current += durationMinutes) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    result.push(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  }

  return result;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export function buildAgendaFromSchedules(
  offices: ApiOffice[],
  appointments: ApiAppointment[],
  year: number,
  month: number,
): AgendaDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const activeAppointments = appointments.filter((appointment) => appointment.status !== "cancelled");
  const agenda: AgendaDay[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const jsDayOfWeek = new Date(year, month, day).getDay();

    offices.forEach((office) => {
      const schedules = (office.schedules ?? []).filter(
        (schedule) => schedule.isActive && schedule.dayOfWeek === jsDayOfWeek,
      );

      if (!schedules.length) {
        return;
      }

      const officeAppointments = activeAppointments
        .filter((appointment) => appointment.officeId === office.id && appointment.date === date)
        .sort((left, right) => left.time.localeCompare(right.time));

      const bookedSlots = officeAppointments.map(mapAppointmentToScheduleEvent);
      const bookedTimes = new Set(officeAppointments.map((appointment) => normalizeTime(appointment.time)));
      const allSlots = uniqueSorted(
        schedules.flatMap((schedule) =>
          buildTimeSlots(schedule.startTime, schedule.endTime, office.appointmentDuration),
        ),
      );

      agenda.push({
        date,
        officeId: office.id,
        freeSlots: allSlots.filter((slot) => !bookedTimes.has(slot)),
        bookedSlots,
      });
    });
  }

  return agenda;
}

export function mapAppointmentsToPatientOptions(appointments: ApiAppointment[]): AppointmentPatientOption[] {
  const registry = new Map<string, AppointmentPatientOption>();

  appointments.forEach((appointment) => {
    if (!appointment.patient?.user) return;

    registry.set(appointment.patientId, {
      id: appointment.patientId,
      fullName: buildFullName(
        appointment.patient.user.name,
        appointment.patient.user.lastName,
      ),
      meta: appointment.patient.user.phone ?? appointment.patient.user.email,
    });
  });

  return Array.from(registry.values()).sort((left, right) =>
    left.fullName.localeCompare(right.fullName),
  );
}

export function mapPrescriptionToItem(prescription: ApiPrescription): PrescriptionItem {
  const primaryMedication = prescription.medications[0];
  return {
    id: prescription.id,
    medication: primaryMedication?.name ?? "Receta",
    professionalName: buildFullName(
      prescription.professional?.user?.name ?? "Profesional",
      prescription.professional?.user?.lastName,
    ),
    date: `${prescription.createdAt}`,
    dose: [
      primaryMedication?.dose,
      primaryMedication?.frequency,
      primaryMedication?.duration,
    ]
      .filter(Boolean)
      .join(" | "),
    diagnosis: safeText(prescription.diagnosis),
    instructions: safeText(prescription.instructions),
    validUntil: safeText(prescription.validUntil),
    medications: prescription.medications.map((medication) => ({
      name: medication.name,
      dose: medication.dose,
      frequency: safeText(medication.frequency),
      duration: safeText(medication.duration),
    })),
  };
}

export function mapStudyToItem(study: ApiStudy): StudyItem {
  const requestedBy = study.professional?.user
    ? buildFullName(study.professional.user.name, study.professional.user.lastName)
    : "Paciente";
  const isAvailable = Boolean(study.fileUrl || study.results);

  return {
    id: study.id,
    title: study.type,
    category: "Estudio medico",
    requestedBy,
    date: study.date,
    status: isAvailable ? "Disponible" : "Pendiente",
    reportSummary: safeText(study.results || study.notes, "Sin resultados cargados."),
    images: study.fileUrl ? [study.fileUrl] : [],
    notes: safeText(study.notes),
    fileUrl: safeText(study.fileUrl),
  };
}

export function mapMedicalRecordToItem(record: ApiMedicalRecord): MedicalRecordItem {
  const professionalName = record.professional?.user
    ? buildFullName(record.professional.user.name, record.professional.user.lastName)
    : undefined;

  return {
    id: record.id,
    title: record.diagnosis.split(".")[0] || "Registro medico",
    summary: safeText(record.treatment || record.notes, "Sin resumen cargado."),
    timestamp: record.date,
    body: [record.diagnosis, record.treatment, record.notes].filter(Boolean).join("\n\n"),
    diagnosis: record.diagnosis,
    treatment: safeText(record.treatment),
    notes: safeText(record.notes),
    professionalName,
    vitalSigns: {
      bloodPressure: safeText(record.vitalSigns?.bloodPressure),
      heartRate: record.vitalSigns?.heartRate ?? undefined,
      temperature: record.vitalSigns?.temperature ?? undefined,
      weight: record.vitalSigns?.weight ?? undefined,
      height: record.vitalSigns?.height ?? undefined,
    },
  };
}

export function mapProfessionalPatientsToListItems(
  patients: ApiProfessionalPatientListItem[],
): PatientListItem[] {
  return patients.map((patient) => {
    const birthDate = patient.birthDate ? new Date(patient.birthDate) : null;
    const today = new Date();
    const age =
      birthDate
        ? today.getFullYear() -
          birthDate.getFullYear() -
          (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? 1 : 0)
        : 0;

    return {
      id: patient.id,
      fullName: buildFullName(patient.user.name, patient.user.lastName),
      age: Number.isFinite(age) ? age : 0,
      document: patient.user.email,
      phone: safeText(patient.user.phone),
      coverage: patient.medicalCoverage ?? "Sin cobertura",
      lastVisit: patient.stats.lastAppointmentDate ?? "",
      nextAppointment: "",
      alerts: [],
      studiesCount: 0,
      reportsCount: patient.stats.totalRecords,
      imagesCount: 0,
      email: patient.user.email,
      appointmentsCount: patient.stats.totalAppointments,
      prescriptionsCount: patient.stats.totalPrescriptions,
      lastAppointmentStatus: patient.stats.lastAppointmentStatus ?? undefined,
    };
  });
}
