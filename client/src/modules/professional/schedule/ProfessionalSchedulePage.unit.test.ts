import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/appointments/api/appointments.api", () => ({
  cancelAppointment: vi.fn(),
  completeAppointment: vi.fn(),
  createAppointment: vi.fn(),
  getProfessionalAppointments: vi.fn(),
}));

vi.mock("@/modules/professional/api/professional.api", () => ({
  getOfficeBlocks: vi.fn(),
  getProfessionalOfficesData: vi.fn(),
}));

vi.mock("@/app/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/shared/components/BookAppointmentModal", () => ({
  BookAppointmentModal: () => null,
}));

vi.mock("@/shared/components/AgendaDayPanel", () => ({
  AgendaDayPanel: () => null,
}));

vi.mock("@/shared/components/ConfirmDialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/shared/components/MonthCalendar", () => ({
  MonthCalendar: () => null,
}));

vi.mock("@/shared/ui/Button", () => ({
  Button: () => null,
}));

vi.mock("@/shared/ui/Select", () => ({
  Select: () => null,
}));

vi.mock("@/shared/constants/query-keys", () => ({
  queryKeys: {
    professionalAppointments: ["professional-appointments"],
    professionalSchedule: ["professional-schedule"],
    professionalPatients: ["professional-patients"],
    professionalOffices: ["professional-offices"],
  },
}));

vi.mock("@/shared/utils/agenda", () => ({
  getAgendaForDate: vi.fn(),
}));
import {
  applyBlocksToAgenda,
  buildCreateAppointmentPayload,
  buildCreateAppointmentSuccessMessage,
  normalizeScheduleTime,
} from "@/modules/professional/schedule/ProfessionalSchedulePage";

describe("ProfessionalSchedulePage helpers", () => {
  it("normalizes times and applies full-day or ranged blocks to the agenda", () => {
    expect(normalizeScheduleTime("09:30:00")).toBe("09:30");

    const agenda = [
      {
        date: "2026-04-19",
        officeId: "office-1",
        officeName: "Centro",
        freeSlots: ["09:00", "09:30", "10:00"],
        bookedSlots: [
          {
            id: "appointment-1",
            officeId: "office-1",
            patientId: "patient-1",
            patientName: "Ana",
            officeName: "Centro",
            date: "2026-04-19T09:00:00",
            status: "Confirmado" as const,
            reason: "Control",
          },
        ],
        blockedSlots: [],
        fullDayBlocked: false,
      },
      {
        date: "2026-04-19",
        officeId: "office-2",
        officeName: "Norte",
        freeSlots: ["11:00", "11:30"],
        bookedSlots: [],
        blockedSlots: [],
        fullDayBlocked: false,
      },
    ];

    expect(applyBlocksToAgenda(agenda, [])).toEqual(agenda);

    const blockedAgenda = applyBlocksToAgenda(agenda, [
      {
        id: "block-range",
        officeId: "office-1",
        date: "2026-04-19",
        type: "time_range",
        startTime: "09:00:00",
        endTime: "10:00:00",
        reason: null,
      },
      {
        id: "block-invalid-range",
        officeId: "office-1",
        date: "2026-04-19",
        type: "time_range",
        startTime: "10:00:00",
        endTime: null,
        reason: "Invalido",
      },
      {
        id: "block-full-day",
        officeId: "office-2",
        date: "2026-04-19",
        type: "full_day",
        startTime: null,
        endTime: null,
        reason: null,
      },
      {
        id: "other-office",
        officeId: "office-3",
        date: "2026-04-19",
        type: "full_day",
        startTime: null,
        endTime: null,
        reason: "Otro",
      },
    ]);

    expect(blockedAgenda[0]).toMatchObject({
      freeSlots: ["10:00"],
      blockedSlots: [
        expect.objectContaining({ time: "09:00", reason: undefined }),
        expect.objectContaining({ time: "09:30", reason: undefined }),
      ],
      fullDayBlocked: false,
      fullDayBlockReason: undefined,
    });

    expect(blockedAgenda[1]).toMatchObject({
      freeSlots: [],
      bookedSlots: [],
      blockedSlots: [],
      fullDayBlocked: true,
      fullDayBlockReason: undefined,
    });
  });

  it("builds appointment payloads and rejects missing or past slots", () => {
    expect(() => buildCreateAppointmentPayload(null, "2026-04-19", "patient-1")).toThrow(
      "No se pudo preparar el turno.",
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00-03:00"));

    expect(() =>
      buildCreateAppointmentPayload(
        {
          time: "11:00",
          officeId: "office-1",
        },
        "2026-04-19",
        "patient-1",
      ),
    ).toThrow("No se pueden agendar turnos en horarios pasados.");

    expect(
      buildCreateAppointmentPayload(
        {
          time: "13:00",
          officeId: "office-1",
          officeName: "Centro",
        },
        "2026-04-19",
        "patient-1",
      ),
    ).toEqual({
      patientId: "patient-1",
      officeId: "office-1",
      date: "2026-04-19",
      time: "13:00",
    });

    vi.useRealTimers();
  });

  it("builds success messages for linked and first-link appointments", () => {
    expect(
      buildCreateAppointmentSuccessMessage(
        {
          time: "13:00",
          officeId: "office-1",
          officeName: "Centro",
        },
        "2026-04-19",
        {
          fullName: "Paciente Vinculado",
          isLinked: true,
        },
      ),
    ).toContain("Turno creado para Paciente Vinculado");

    expect(
      buildCreateAppointmentSuccessMessage(
        {
          time: "13:00",
          officeId: "office-1",
        },
        "2026-04-19",
        {
          fullName: "Paciente Nuevo",
          isLinked: false,
        },
      ),
    ).toContain("primer vinculo registrado");

    expect(
      buildCreateAppointmentSuccessMessage(null, "2026-04-19", {
        fullName: "Paciente Vinculado",
        isLinked: true,
      }),
    ).toBe("Turno creado. Queda pendiente de confirmacion del paciente.");

    expect(
      buildCreateAppointmentSuccessMessage(null, "2026-04-19", {
        fullName: "Paciente Nuevo",
        isLinked: false,
      }),
    ).toContain("Turno creado y primer vinculo registrado para Paciente Nuevo");
  });
});
