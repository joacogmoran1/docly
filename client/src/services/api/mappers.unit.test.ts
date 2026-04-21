import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __mappersTestables,
  buildAgendaFromSchedules,
  mapApiAppointmentStatus,
  mapAppointmentToScheduleEvent,
  mapApiUserToSessionUser,
  mapAppointmentsToPatientOptions,
  mapHealthInfoToSections,
  mapMedicalRecordToItem,
  mapOfficeToItem,
  mapPatientAppointmentsToItems,
  mapPatientProfileToView,
  mapPrescriptionToItem,
  mapProfessionalPatientsToListItems,
  mapProfessionalProfileToView,
  mapProfessionalToCard,
  mapStudyToItem,
  toDateTimeIso,
} from "@/services/api/mappers";

describe("api mappers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps session users and profile views with role-specific data", () => {
    const sessionUser = mapApiUserToSessionUser({
      id: "user-1",
      email: "sofia@example.com",
      name: "Sofia",
      lastName: "Lopez",
      phone: "+54 11 5555 0000",
      role: "patient",
      isActive: true,
      patient: {
        id: "patient-1",
        userId: "user-1",
        birthDate: "1990-01-01",
        gender: "female",
        bloodType: "A+",
        medicalCoverage: "OSDE",
        coverageNumber: "1234",
      },
    });

    expect(sessionUser).toMatchObject({
      fullName: "Sofia Lopez",
      subtitle: "OSDE | Nro 1234",
      avatar: "SL",
      patientId: "patient-1",
    });

    expect(
      mapPatientProfileToView({
        id: "patient-1",
        userId: "user-1",
        birthDate: null,
        gender: null,
        bloodType: null,
        medicalCoverage: null,
        coverageNumber: null,
        user: {
          name: "Sofia",
          lastName: null,
          email: "sofia@example.com",
          phone: null,
        },
      }),
    ).toMatchObject({
      fullName: "Sofia",
      lastName: "",
      phone: "",
      coverage: "",
    });

    expect(
      mapProfessionalProfileToView({
        id: "professional-1",
        userId: "user-prof-1",
        specialty: "Clinica medica",
        licenseNumber: "MP 123",
        acceptedCoverages: ["OSDE", "Swiss Medical"],
        fees: null,
        user: {
          id: "user-prof-1",
          name: "Lucas",
          lastName: "Perez",
          email: "lucas@example.com",
          phone: null,
        },
      }),
    ).toMatchObject({
      fullName: "Lucas Perez",
      acceptedCoveragesLabel: "OSDE, Swiss Medical",
      fees: "",
    });
  });

  it("covers internal helper fallbacks used by the api mappers", () => {
    expect(__mappersTestables.safeText(undefined, "fallback")).toBe("fallback");
    expect(__mappersTestables.parseStudyAttachments("data:application/pdf;base64,ZmFrZQ==")).toEqual([
      "data:application/pdf;base64,ZmFrZQ==",
    ]);
    expect(__mappersTestables.buildInitials("", null)).toBe("DL");
    expect(
      __mappersTestables.mapRoleSubtitle({
        id: "user-patient-empty",
        email: "patient@example.com",
        name: "Paciente",
        lastName: "",
        phone: null,
        role: "patient",
        isActive: true,
        patient: null,
      }),
    ).toBe("Sin cobertura");
    expect(
      __mappersTestables.mapRoleSubtitle({
        id: "user-prof-empty",
        email: "professional@example.com",
        name: "Profesional",
        lastName: "",
        phone: null,
        role: "professional",
        isActive: true,
        professional: null,
      }),
    ).toBe("Profesional");
    expect(__mappersTestables.formatNextAvailable(null)).toBe("Sin disponibilidad proxima");
    expect(__mappersTestables.buildTimeSlots("09:00:00", "10:00:00", 30)).toEqual([
      "09:00",
      "09:30",
    ]);
    expect(__mappersTestables.uniqueSorted(["10:00", "09:00", "10:00"])).toEqual([
      "09:00",
      "10:00",
    ]);
  });

  it("maps professional cards, offices and patient appointment items", () => {
    const professionalCard = mapProfessionalToCard(
      {
        id: "professional-1",
        userId: "user-prof-1",
        specialty: "Clinica medica",
        licenseNumber: "MP 123",
        acceptedCoverages: ["OSDE"],
        fees: null,
        nextAvailable: "2026-04-19T16:30:00-03:00",
        user: {
          id: "user-prof-1",
          name: "Lucas",
          lastName: "Perez",
          email: "lucas@example.com",
          phone: null,
        },
        offices: [],
      },
      { isInTeam: true },
    );

    expect(professionalCard.location).toBe("Sin consultorio registrado");
    expect(professionalCard.nextAvailable).toMatch(/^Hoy /);
    expect(professionalCard.bio).toBe("Matricula MP 123");
    expect(professionalCard.isInTeam).toBe(true);

    expect(
      mapOfficeToItem({
        id: "office-1",
        professionalId: "professional-1",
        name: "Consultorio Centro",
        address: "Calle 123",
        phone: null,
        appointmentDuration: 30,
        schedules: [
          { dayOfWeek: 1, startTime: "09:00:00", endTime: "12:00:00", isActive: true },
          { dayOfWeek: 2, startTime: "14:00:00", endTime: "16:00:00", isActive: false },
        ],
      }),
    ).toMatchObject({
      notes: "Sin telefono registrado.",
      days: "Lunes",
      schedule: "09:00 / 12:00",
      appointmentDuration: "30 min",
    });

    expect(
      mapPatientAppointmentsToItems([
        {
          id: "appointment-1",
          patientId: "patient-1",
          professionalId: "professional-1",
          officeId: "office-1",
          date: "2026-04-20",
          time: "09:00:00",
          duration: 30,
          status: "pending",
          reason: null,
          notes: null,
          cancellationReason: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
          professional: {
            id: "professional-1",
            user: {
              id: "user-prof-1",
              name: "Lucas",
              lastName: "Perez",
              email: "lucas@example.com",
              phone: null,
            },
          },
          office: {
            id: "office-1",
            name: "Consultorio Centro",
          },
        },
      ]),
    ).toEqual([
      {
        id: "appointment-1",
        professionalName: "Lucas Perez",
        specialty: "Consulta",
        date: "2026-04-20T09:00:00",
        office: "Consultorio Centro",
        status: "Pendiente",
        type: "Presencial",
      },
    ]);

    expect(
      mapPatientAppointmentsToItems([
        {
          id: "appointment-fallbacks",
          patientId: "patient-1",
          professionalId: "professional-1",
          officeId: "office-1",
          date: "2026-04-20",
          time: "09:00:00",
          duration: 30,
          status: "cancelled",
          reason: null,
          notes: null,
          cancellationReason: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
        },
      ]),
    ).toEqual([
      {
        id: "appointment-fallbacks",
        professionalName: "Profesional",
        specialty: "Consulta",
        date: "2026-04-20T09:00:00",
        office: "Consultorio",
        status: "Cancelado",
        type: "Presencial",
      },
    ]);
  });

  it("formats linked professional cards and excludes past free slots from agenda", () => {
    const tomorrowCard = mapProfessionalToCard({
      id: "professional-2",
      userId: "user-prof-2",
      specialty: "Cardiologia",
      licenseNumber: "MN 456",
      acceptedCoverages: ["OSDE", "Swiss Medical"],
      fees: "45000",
      nextAvailable: "2026-04-20T16:30:00-03:00",
      user: {
        id: "user-prof-2",
        name: "Camila",
        lastName: "Rios",
        email: "camila@example.com",
        phone: null,
      },
      offices: [
        {
          id: "office-9",
          professionalId: "professional-2",
          name: "Consultorio Sur",
          address: "Av. Siempre Viva 742",
          phone: "+54 11 4000 0000",
          appointmentDuration: 30,
          schedules: [],
        },
      ],
    });

    expect(tomorrowCard).toMatchObject({
      location: "Av. Siempre Viva 742",
      bio: "Honorarios desde $45000",
      offices: [{ id: "office-9", name: "Consultorio Sur" }],
    });
    expect(tomorrowCard.nextAvailable).toMatch(/^Manana /);

    const agenda = buildAgendaFromSchedules(
      [
        {
          id: "office-1",
          professionalId: "professional-1",
          name: "Consultorio Centro",
          address: "Calle 123",
          phone: null,
          appointmentDuration: 30,
          schedules: [
            { dayOfWeek: 0, startTime: "11:30:00", endTime: "13:00:00", isActive: true },
          ],
        },
      ],
      [],
      2026,
      3,
    );

    const todayAgenda = agenda.find(
      (entry) => entry.date === "2026-04-19" && entry.officeId === "office-1",
    );

    expect(todayAgenda?.freeSlots).toEqual(["12:30"]);
  });

  it("formats distant availability and sorts booked schedule events", () => {
    const distantCard = mapProfessionalToCard({
      id: "professional-3",
      userId: "user-prof-3",
      specialty: "Dermatologia",
      licenseNumber: "MP 999",
      acceptedCoverages: [],
      fees: null,
      nextAvailable: "2026-04-28T08:15:00-03:00",
      user: {
        id: "user-prof-3",
        name: "Valeria",
        lastName: "Suarez",
        email: "valeria@example.com",
        phone: null,
      },
      offices: [],
    });

    expect(distantCard.nextAvailable).toContain("8:15");
    expect(distantCard.nextAvailable).not.toContain("Hoy");
    expect(distantCard.nextAvailable).not.toContain("Manana");

    const agenda = buildAgendaFromSchedules(
      [
        {
          id: "office-1",
          professionalId: "professional-1",
          name: "Consultorio Centro",
          address: "Calle 123",
          phone: null,
          appointmentDuration: 30,
          schedules: [
            { dayOfWeek: 1, startTime: "09:00:00", endTime: "11:00:00", isActive: true },
          ],
        },
        {
          id: "office-inactive",
          professionalId: "professional-1",
          name: "Consultorio Cerrado",
          address: "Calle 999",
          phone: null,
          appointmentDuration: 30,
          schedules: [
            { dayOfWeek: 1, startTime: "09:00:00", endTime: "11:00:00", isActive: false },
          ],
        },
      ],
      [
        {
          id: "appointment-late",
          patientId: "patient-1",
          professionalId: "professional-1",
          officeId: "office-1",
          date: "2099-01-05",
          time: "10:00:00",
          duration: 30,
          status: "confirmed",
          reason: "Control",
          notes: null,
          cancellationReason: null,
          createdAt: "2099-01-01T10:00:00Z",
          updatedAt: "2099-01-01T10:00:00Z",
          patient: {
            id: "patient-1",
            user: {
              id: "user-patient-1",
              name: "Ana",
              lastName: "Lopez",
              email: "ana@example.com",
              phone: null,
            },
          },
          office: {
            id: "office-1",
            name: "Consultorio Centro",
          },
        },
        {
          id: "appointment-early",
          patientId: "patient-2",
          professionalId: "professional-1",
          officeId: "office-1",
          date: "2099-01-05",
          time: "09:00:00",
          duration: 30,
          status: "completed",
          reason: "Seguimiento",
          notes: null,
          cancellationReason: null,
          createdAt: "2099-01-01T10:00:00Z",
          updatedAt: "2099-01-01T10:00:00Z",
          patient: {
            id: "patient-2",
            user: {
              id: "user-patient-2",
              name: "Luis",
              lastName: "Perez",
              email: "luis@example.com",
              phone: null,
            },
          },
          office: {
            id: "office-1",
            name: "Consultorio Centro",
          },
        },
      ],
      2099,
      0,
    );

    const mondayAgenda = agenda.find((entry) => entry.date === "2099-01-05" && entry.officeId === "office-1");
    expect(mondayAgenda?.bookedSlots.map((slot) => slot.id)).toEqual([
      "appointment-early",
      "appointment-late",
    ]);
    expect(agenda.some((entry) => entry.officeId === "office-inactive")).toBe(false);
  });

  it("falls back for invalid availability dates and malformed data attachments", () => {
    const timeFormatterSpy = vi
      .spyOn(Date.prototype, "toLocaleTimeString")
      .mockImplementation(() => {
        throw new RangeError("bad date");
      });

    const invalidCard = mapProfessionalToCard({
      id: "professional-4",
      userId: "user-prof-4",
      specialty: "Neurologia",
      licenseNumber: "MN 123",
      acceptedCoverages: [],
      fees: null,
      nextAvailable: "2026-04-22T09:00:00-03:00",
      user: {
        id: "user-prof-4",
        name: "Mora",
        lastName: "Diaz",
        email: "mora@example.com",
        phone: null,
      },
      offices: [],
    });

    expect(invalidCard.nextAvailable).toBe("Consultar agenda");
    timeFormatterSpy.mockRestore();

    expect(
      mapStudyToItem({
        id: "study-bad-data",
        patientId: "patient-1",
        professionalId: null,
        type: "Radiografia",
        date: "2026-04-15",
        results: null,
        fileUrl: "data:text/plain;base64,ZmFrZQ==",
        notes: null,
        createdAt: "2026-04-15T10:00:00Z",
        updatedAt: "2026-04-15T10:00:00Z",
        professional: null,
      }),
    ).toMatchObject({
      status: "Pendiente",
      attachmentUrls: [],
      images: [],
      fileUrl: undefined,
      reportSummary: "Sin imagenes cargadas.",
    });
  });

  it("builds patient options and schedule agenda while skipping cancelled appointments", () => {
    const patientOptions = mapAppointmentsToPatientOptions([
      {
        id: "appointment-2",
        patientId: "patient-2",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-20",
        time: "10:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        patient: {
          id: "patient-2",
          user: {
            id: "user-patient-2",
            name: "Luis",
            lastName: "Perez",
            email: "luis@example.com",
            phone: null,
          },
        },
      },
      {
        id: "appointment-1",
        patientId: "patient-1",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-20",
        time: "09:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        patient: {
          id: "patient-1",
          user: {
            id: "user-patient-1",
            name: "Ana",
            lastName: "Lopez",
            email: "ana@example.com",
            phone: "+54 11 4444 0000",
          },
        },
      },
      {
        id: "appointment-3",
        patientId: "patient-1",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-20",
        time: "11:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        patient: {
          id: "patient-1",
          user: {
            id: "user-patient-1",
            name: "Ana",
            lastName: "Lopez",
            email: "ana@example.com",
            phone: null,
          },
        },
      },
    ]);

    expect(patientOptions).toEqual([
      { id: "patient-1", fullName: "Ana Lopez", meta: "ana@example.com" },
      { id: "patient-2", fullName: "Luis Perez", meta: "luis@example.com" },
    ]);

    const firstMonday = Array.from({ length: 31 }, (_, index) => index + 1).find(
      (day) => new Date(2099, 0, day).getDay() === 1,
    );
    expect(firstMonday).toBeDefined();

    const isoDate = `2099-01-${String(firstMonday).padStart(2, "0")}`;
    const agenda = buildAgendaFromSchedules(
      [
        {
          id: "office-1",
          professionalId: "professional-1",
          name: "Consultorio Centro",
          address: "Calle 123",
          phone: null,
          appointmentDuration: 30,
          schedules: [
            { dayOfWeek: 1, startTime: "09:00:00", endTime: "10:00:00", isActive: true },
          ],
        },
      ],
      [
        {
          id: "appointment-confirmed",
          patientId: "patient-1",
          professionalId: "professional-1",
          officeId: "office-1",
          date: isoDate,
          time: "09:00:00",
          duration: 30,
          status: "confirmed",
          reason: "Control",
          notes: null,
          cancellationReason: null,
          createdAt: "2099-01-01T10:00:00Z",
          updatedAt: "2099-01-01T10:00:00Z",
          patient: {
            id: "patient-1",
            user: {
              id: "user-patient-1",
              name: "Ana",
              lastName: "Lopez",
              email: "ana@example.com",
              phone: null,
            },
          },
          office: {
            id: "office-1",
            name: "Consultorio Centro",
          },
        },
        {
          id: "appointment-cancelled",
          patientId: "patient-2",
          professionalId: "professional-1",
          officeId: "office-1",
          date: isoDate,
          time: "09:30:00",
          duration: 30,
          status: "cancelled",
          reason: "Control",
          notes: null,
          cancellationReason: "No puede asistir",
          createdAt: "2099-01-01T10:00:00Z",
          updatedAt: "2099-01-01T10:00:00Z",
        },
      ],
      2099,
      0,
    );

    const mondayAgenda = agenda.find((entry) => entry.date === isoDate && entry.officeId === "office-1");
    expect(mondayAgenda?.bookedSlots).toHaveLength(1);
    expect(mondayAgenda?.bookedSlots[0]).toMatchObject({
      id: "appointment-confirmed",
      patientName: "Ana Lopez",
      status: "Confirmado",
    });
    expect(mondayAgenda?.freeSlots).toContain("09:30");
    expect(mondayAgenda?.freeSlots).not.toContain("09:00");
  });

  it("skips orphan appointments and preserves patient contact priority in options", () => {
    const patientOptions = mapAppointmentsToPatientOptions([
      {
        id: "appointment-no-patient",
        patientId: "patient-missing",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-20",
        time: "09:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      },
      {
        id: "appointment-phone",
        patientId: "patient-1",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-20",
        time: "10:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        patient: {
          id: "patient-1",
          user: {
            id: "user-patient-1",
            name: "Ana",
            lastName: "Lopez",
            email: "ana@example.com",
            phone: "+54 11 4444 0000",
          },
        },
      },
    ]);

    expect(patientOptions).toEqual([
      {
        id: "patient-1",
        fullName: "Ana Lopez",
        meta: "+54 11 4444 0000",
      },
    ]);
  });

  it("maps studies and prescriptions with sanitized resources and fallbacks", () => {
    expect(
      mapStudyToItem({
        id: "study-image",
        patientId: "patient-1",
        professionalId: null,
        type: "Radiografia",
        date: "2026-04-10",
        results: null,
        fileUrl: "https://example.com/a.jpg, javascript:alert(1), https://example.com/b.jpg",
        notes: "Control",
        createdAt: "2026-04-10T10:00:00Z",
        updatedAt: "2026-04-10T10:00:00Z",
        professional: null,
      }),
    ).toMatchObject({
      requestedBy: "Paciente",
      status: "Disponible",
      reportSummary: "2 imagenes cargadas.",
      images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      fileUrl: "https://example.com/a.jpg",
      attachmentKind: "image",
    });

    expect(
      mapStudyToItem({
        id: "study-pdf",
        patientId: "patient-1",
        professionalId: "professional-1",
        type: "Tipo inexistente",
        date: "2026-04-11",
        results: "data:application/pdf;base64,ZmFrZQ==",
        fileUrl: null,
        notes: null,
        createdAt: "2026-04-11T10:00:00Z",
        updatedAt: "2026-04-11T10:00:00Z",
        professional: {
          id: "professional-1",
          user: {
            id: "user-prof-1",
            name: "Lucas",
            lastName: "Perez",
            email: "lucas@example.com",
            phone: null,
          },
        },
      }),
    ).toMatchObject({
      requestedBy: "Lucas Perez",
      attachmentKind: "pdf",
      reportSummary: "Informe PDF cargado.",
      reportUrl: "data:application/pdf;base64,ZmFrZQ==",
    });

    expect(
      mapPrescriptionToItem({
        id: "prescription-1",
        patientId: "patient-1",
        professionalId: "professional-1",
        medications: [],
        diagnosis: null,
        instructions: null,
        validUntil: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      }),
    ).toMatchObject({
      medication: "Receta",
      professionalName: "Profesional",
      dose: "",
      medications: [],
    });
  });

  it("keeps pending studies and empty medical records readable when payloads are sparse", () => {
    expect(
      mapStudyToItem({
        id: "study-empty",
        patientId: "patient-1",
        professionalId: null,
        type: "Radiografia",
        date: "2026-04-13",
        results: null,
        fileUrl: "javascript:alert(1), ftp://malicioso",
        notes: null,
        createdAt: "2026-04-13T10:00:00Z",
        updatedAt: "2026-04-13T10:00:00Z",
        professional: null,
      }),
    ).toMatchObject({
      status: "Pendiente",
      reportSummary: "Sin imagenes cargadas.",
      images: [],
      attachmentUrls: [],
      fileUrl: undefined,
    });

    expect(
      mapMedicalRecordToItem({
        id: "record-empty",
        patientId: "patient-1",
        professionalId: null,
        appointmentId: null,
        date: "2026-04-13",
        reason: "",
        diagnosis: "",
        indications: null,
        evolution: null,
        nextCheckup: "custom_90_days",
        vitalSigns: {},
        createdAt: "2026-04-13T10:00:00Z",
        updatedAt: "2026-04-13T10:00:00Z",
      } as any),
    ).toMatchObject({
      title: "Registro medico",
      summary: "Sin resumen cargado.",
      notes: "Proximo control: custom_90_days",
      professionalName: undefined,
    });
  });

  it("maps detailed prescriptions and professional sessions with fallback subtitles", () => {
    expect(
      mapPrescriptionToItem({
        id: "prescription-2",
        patientId: "patient-1",
        professionalId: "professional-1",
        medications: [
          {
            name: "Ibuprofeno",
            dose: "600 mg",
            frequency: "Cada 8 horas",
            duration: "5 dias",
          },
          {
            name: "Omeprazol",
            dose: "20 mg",
            frequency: null,
            duration: null,
          },
        ],
        diagnosis: "Dolor lumbar",
        instructions: "Tomar con comida",
        validUntil: "2026-04-30",
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
        professional: {
          id: "professional-1",
          user: {
            id: "user-prof-1",
            name: "Lucas",
            lastName: "Perez",
            email: "lucas@example.com",
            phone: null,
          },
        },
      }),
    ).toMatchObject({
      medication: "Ibuprofeno",
      professionalName: "Lucas Perez",
      dose: "600 mg | Cada 8 horas | 5 dias",
      medications: [
        {
          name: "Ibuprofeno",
          dose: "600 mg",
          frequency: "Cada 8 horas",
          duration: "5 dias",
        },
        {
          name: "Omeprazol",
          dose: "20 mg",
          frequency: "",
          duration: "",
        },
      ],
    });

    expect(
      mapApiUserToSessionUser({
        id: "user-prof-4",
        email: "prof@example.com",
        name: "Dana",
        lastName: null,
        phone: null,
        role: "professional",
        isActive: true,
        professional: {
          id: "professional-4",
          userId: "user-prof-4",
          specialty: "Clinica medica",
          licenseNumber: null,
          acceptedCoverages: [],
          fees: null,
        },
      } as any),
    ).toMatchObject({
      fullName: "Dana",
      subtitle: "Clinica medica",
      avatar: "D",
      professionalId: "professional-4",
    });
  });

  it("maps medical records, patient lists and health sections with empty-state fallbacks", () => {
    expect(mapHealthInfoToSections(null)[0]).toMatchObject({
      title: "Informacion de salud",
      items: ["Todavia no hay informacion registrada."],
    });

    expect(
      mapHealthInfoToSections({
        id: "health-1",
        patientId: "patient-1",
        diseases: [],
        allergies: [],
        medications: [],
        notes: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      })[1],
    ).toMatchObject({
      title: "Alergias",
      items: ["Sin alergias registradas."],
    });

    expect(
      mapMedicalRecordToItem({
        id: "record-1",
        patientId: "patient-1",
        professionalId: "professional-1",
        appointmentId: null,
        date: "2026-04-12",
        reason: "Control anual. Seguimiento",
        diagnosis: "Asma estable",
        indications: "",
        evolution: "Paciente estable",
        nextCheckup: "1_month",
        vitalSigns: {},
        createdAt: "2026-04-12T10:00:00Z",
        updatedAt: "2026-04-12T10:00:00Z",
      }),
    ).toMatchObject({
      title: "Control anual",
      summary: "Paciente estable",
      notes: "Paciente estable\n\nProximo control: 1 mes",
      treatment: "",
    });

    expect(
      mapProfessionalPatientsToListItems([
        {
          id: "patient-1",
          userId: "user-patient-1",
          dni: null,
          birthDate: "2000-02-01",
          gender: "female",
          bloodType: null,
          medicalCoverage: null,
          coverageNumber: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
          user: {
            id: "user-patient-1",
            name: "Ana",
            lastName: "Lopez",
            email: "ana@example.com",
            phone: null,
          },
          stats: {
            totalAppointments: 4,
            totalRecords: 2,
            totalPrescriptions: 1,
            lastAppointmentDate: "2026-04-10",
            lastAppointmentStatus: "confirmed",
          },
        },
        {
          id: "patient-2",
          userId: "user-patient-2",
          dni: "30111222",
          birthDate: null,
          gender: "male",
          bloodType: null,
          medicalCoverage: "Swiss Medical",
          coverageNumber: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
          user: {
            id: "user-patient-2",
            name: "Luis",
            lastName: "Perez",
            email: "luis@example.com",
            phone: "+54 11 4444 0000",
          },
          stats: {
            totalAppointments: 1,
            totalRecords: 0,
            totalPrescriptions: 0,
            lastAppointmentDate: null,
            lastAppointmentStatus: null,
          },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        fullName: "Ana Lopez",
        age: 26,
        document: "ana@example.com",
        coverage: "Sin cobertura",
        lastAppointmentStatus: "Confirmado",
      }),
      expect.objectContaining({
        fullName: "Luis Perez",
        age: 0,
        document: "30111222",
      coverage: "Swiss Medical",
    }),
  ]);
  });

  it("handles medical-record and patient-list edge cases for remaining mapper branches", () => {
    expect(
      mapMedicalRecordToItem({
        id: "record-no-next-checkup",
        patientId: "patient-1",
        professionalId: "professional-1",
        appointmentId: null,
        date: "2026-04-19",
        reason: "Consulta clinica",
        diagnosis: "",
        indications: "Reposo por 48 horas",
        evolution: "",
        nextCheckup: null,
        vitalSigns: {
          bloodPressure: "120/80",
          heartRate: 70,
          temperature: 36.5,
          weight: 68,
          height: 170,
        },
        createdAt: "2026-04-19T10:00:00Z",
        updatedAt: "2026-04-19T10:00:00Z",
        professional: {
          id: "professional-1",
          user: {
            id: "user-prof-1",
            name: "Lucas",
            lastName: "Perez",
            email: "lucas@example.com",
            phone: null,
          },
        },
      }),
    ).toMatchObject({
      professionalName: "Lucas Perez",
      summary: "Reposo por 48 horas",
      notes: "",
      treatment: "Reposo por 48 horas",
      vitalSigns: {
        bloodPressure: "120/80",
        heartRate: 70,
        temperature: 36.5,
        weight: 68,
        height: 170,
      },
    });

    expect(
      mapProfessionalPatientsToListItems([
        {
          id: "patient-upcoming-birthday",
          userId: "user-patient-3",
          dni: null,
          birthDate: "2000-12-01",
          gender: "female",
          bloodType: null,
          medicalCoverage: null,
          coverageNumber: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
          user: {
            id: "user-patient-3",
            name: "Eva",
            lastName: "Diaz",
            email: "eva@example.com",
            phone: null,
          },
          stats: {
            totalAppointments: 2,
            totalRecords: 1,
            totalPrescriptions: 0,
            lastAppointmentDate: null,
            lastAppointmentStatus: null,
          },
        },
        {
          id: "patient-invalid-birthdate",
          userId: "user-patient-4",
          dni: null,
          birthDate: "no-es-una-fecha",
          gender: "male",
          bloodType: null,
          medicalCoverage: null,
          coverageNumber: null,
          createdAt: "2026-04-01T10:00:00Z",
          updatedAt: "2026-04-01T10:00:00Z",
          user: {
            id: "user-patient-4",
            name: "Tomas",
            lastName: "Lopez",
            email: "tomas@example.com",
            phone: null,
          },
          stats: {
            totalAppointments: 0,
            totalRecords: 0,
            totalPrescriptions: 0,
            lastAppointmentDate: null,
            lastAppointmentStatus: null,
          },
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        fullName: "Eva Diaz",
        age: 25,
      }),
      expect.objectContaining({
        fullName: "Tomas Lopez",
        age: 0,
      }),
    ]);
  });

  it("maps statuses and local iso timestamps consistently", () => {
    expect(mapApiAppointmentStatus("confirmed")).toBe("Confirmado");
    expect(mapApiAppointmentStatus("completed")).toBe("Completado");
    expect(mapApiAppointmentStatus("cancelled")).toBe("Cancelado");
    expect(mapApiAppointmentStatus("pending")).toBe("Pendiente");
    expect(toDateTimeIso("2026-04-19", "09:30:45")).toBe("2026-04-19T09:30:00");
  });

  it("covers the remaining professional, office and appointment mapper fallbacks", () => {
    expect(
      __mappersTestables.mapRoleSubtitle({
        id: "user-prof-license",
        email: "lic@example.com",
        name: "Lara",
        lastName: "Suarez",
        phone: null,
        role: "professional",
        isActive: true,
        professional: {
          id: "professional-license",
          userId: "user-prof-license",
          specialty: null as never,
          licenseNumber: "MN 777",
          acceptedCoverages: [],
          fees: null,
        },
      }),
    ).toBe("Profesional | MN 777");

    expect(
      mapProfessionalProfileToView({
        id: "professional-null-coverages",
        userId: "user-prof-null-coverages",
        specialty: "Clinica medica",
        licenseNumber: "MP 888",
        acceptedCoverages: null as never,
        fees: null,
        user: {
          id: "user-prof-null-coverages",
          name: "Pia",
          lastName: "Gomez",
          email: "pia@example.com",
          phone: null,
        },
      }),
    ).toMatchObject({
      acceptedCoverages: [],
      acceptedCoveragesLabel: "",
    });

    expect(
      mapHealthInfoToSections({
        id: "health-complete",
        patientId: "patient-1",
        diseases: ["Asma"],
        allergies: ["Penicilina"],
        medications: ["Salbutamol"],
        notes: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      }),
    ).toEqual([
      expect.objectContaining({ items: ["Asma"] }),
      expect.objectContaining({ items: ["Penicilina"] }),
      expect.objectContaining({ items: ["Salbutamol"] }),
    ]);

    expect(toDateTimeIso("2026-04-19", "9")).toBe("2026-04-19T9:00");

    expect(
      mapProfessionalToCard({
        id: "professional-without-offices",
        userId: "user-prof-without-offices",
        specialty: "Pediatria",
        licenseNumber: "MN 321",
        acceptedCoverages: null as never,
        fees: null,
        nextAvailable: null,
        user: {
          id: "user-prof-without-offices",
          name: "Julia",
          lastName: "Marin",
          email: "julia@example.com",
          phone: null,
        },
      } as never),
    ).toMatchObject({
      coverage: [],
      location: "Sin consultorio registrado",
      offices: [],
      isInTeam: false,
    });

    expect(
      mapOfficeToItem({
        id: "office-phone",
        professionalId: "professional-1",
        name: "Consultorio Este",
        address: "Calle 3",
        phone: "+54 11 4555 0000",
        appointmentDuration: 45,
        schedules: [
          { dayOfWeek: 9, startTime: "08:00:00", endTime: "09:00:00", isActive: true },
        ],
      }),
    ).toMatchObject({
      notes: "Telefono: +54 11 4555 0000",
      days: "Dia",
    });

    expect(
      mapOfficeToItem({
        id: "office-no-schedules",
        professionalId: "professional-1",
        name: "Consultorio Vacio",
        address: "Calle 4",
        phone: null,
        appointmentDuration: 30,
      } as never),
    ).toMatchObject({
      days: "",
      schedule: "",
    });

    expect(
      mapAppointmentToScheduleEvent({
        id: "appointment-cancelled",
        patientId: "patient-1",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-19",
        time: "09:00:00",
        duration: 30,
        status: "cancelled",
        reason: null,
        notes: null,
        cancellationReason: "No puede asistir",
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      }),
    ).toMatchObject({
      patientName: "Paciente",
      officeName: "Consultorio",
      status: "Cancelado",
      reason: "Consulta",
    });

    expect(
      mapAppointmentToScheduleEvent({
        id: "appointment-confirmed",
        patientId: "patient-2",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-19",
        time: "10:00:00",
        duration: 30,
        status: "confirmed",
        reason: "Chequeo",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      }),
    ).toMatchObject({
      status: "Confirmado",
      reason: "Chequeo",
    });

    expect(
      mapAppointmentToScheduleEvent({
        id: "appointment-pending",
        patientId: "patient-3",
        professionalId: "professional-1",
        officeId: "office-1",
        date: "2026-04-19",
        time: "11:00:00",
        duration: 30,
        status: "pending",
        reason: "Control",
        notes: null,
        cancellationReason: null,
        createdAt: "2026-04-01T10:00:00Z",
        updatedAt: "2026-04-01T10:00:00Z",
      }),
    ).toMatchObject({
      status: "Pendiente",
      reason: "Control",
    });
  });

  it("covers the remaining agenda and study attachment branches", () => {
    expect(
      buildAgendaFromSchedules(
        [
          {
            id: "office-no-schedules",
            professionalId: "professional-1",
            name: "Sin horarios",
            address: "Calle 1",
            phone: null,
            appointmentDuration: 30,
          } as never,
        ],
        [],
        2026,
        3,
      ),
    ).toEqual([]);

    expect(
      mapStudyToItem({
        id: "study-single-image",
        patientId: "patient-1",
        professionalId: null,
        type: "Radiografia",
        date: "2026-04-15",
        results: null,
        fileUrl: "https://example.com/rx.jpg",
        notes: null,
        createdAt: "2026-04-15T10:00:00Z",
        updatedAt: "2026-04-15T10:00:00Z",
        professional: null,
      }),
    ).toMatchObject({
      status: "Disponible",
      reportSummary: "1 imagen cargada.",
      images: ["https://example.com/rx.jpg"],
    });

    expect(
      mapStudyToItem({
        id: "study-pdf-attachments",
        patientId: "patient-1",
        professionalId: null,
        type: "Analisis de sangre",
        date: "2026-04-16",
        results: null,
        fileUrl: "https://example.com/report.pdf",
        notes: null,
        createdAt: "2026-04-16T10:00:00Z",
        updatedAt: "2026-04-16T10:00:00Z",
        professional: null,
      }),
    ).toMatchObject({
      status: "Disponible",
      reportSummary: "Resultados en PDF cargados.",
      images: [],
      fileUrl: "https://example.com/report.pdf",
    });
  });
});
