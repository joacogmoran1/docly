import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionUser } from "@/test/factories/auth";

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const appointmentsApiMocks = vi.hoisted(() => ({
  getProfessionalAppointments: vi.fn(),
  cancelAppointment: vi.fn(),
  completeAppointment: vi.fn(),
  createAppointment: vi.fn(),
}));

const professionalApiMocks = vi.hoisted(() => ({
  getProfessionalOfficesData: vi.fn(),
  getOfficeBlocks: vi.fn(),
}));

const dateUtilsMocks = vi.hoisted(() => ({
  isPastScheduleSlot: vi.fn(),
}));

vi.mock("@/app/providers/AuthProvider", () => authMocks);
vi.mock("@/modules/appointments/api/appointments.api", () => appointmentsApiMocks);
vi.mock("@/modules/professional/api/professional.api", () => professionalApiMocks);
vi.mock("@/shared/utils/date", async () => {
  const actual = await vi.importActual<typeof import("@/shared/utils/date")>("@/shared/utils/date");
  return {
    ...actual,
    isPastScheduleSlot: dateUtilsMocks.isPastScheduleSlot,
  };
});
vi.mock("@/shared/components/ConfirmDialog", () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <button type="button" onClick={onConfirm}>
          Confirmar {title}
        </button>
        <button type="button" onClick={onClose}>
          Cerrar {title}
        </button>
      </div>
    ) : null,
}));
vi.mock("@/shared/components/MonthCalendar", () => ({
  MonthCalendar: ({
    agenda,
    year,
    month,
    selectedDate,
    officeId,
    centerContent,
    canGoPrevious,
    onPreviousMonth,
    onNextMonth,
    onGoToday,
  }: {
    agenda: Array<{ officeId: string; fullDayBlocked?: boolean; blockedSlots?: Array<unknown> }>;
    year: number;
    month: number;
    selectedDate: string;
    officeId?: string;
    centerContent?: ReactNode;
    canGoPrevious: boolean;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onGoToday: () => void;
  }) => (
    <div>
      <div>MonthCalendar mock</div>
      <div data-testid="calendar-month">{`${year}-${String(month + 1).padStart(2, "0")}`}</div>
      <div data-testid="calendar-selected-date">{selectedDate}</div>
      <div data-testid="calendar-office-filter">{officeId ?? "all"}</div>
      <div data-testid="calendar-agenda-count">{agenda.length}</div>
      <div data-testid="calendar-full-day-count">
        {agenda.filter((item) => item.fullDayBlocked).length}
      </div>
      <div data-testid="calendar-blocked-slot-count">
        {agenda.reduce((sum, item) => sum + (item.blockedSlots?.length ?? 0), 0)}
      </div>
      {centerContent}
      <button type="button" onClick={onPreviousMonth} disabled={!canGoPrevious}>
        Mes anterior
      </button>
      <button type="button" onClick={onNextMonth}>
        Mes siguiente
      </button>
      <button type="button" onClick={onGoToday}>
        Ir a hoy
      </button>
    </div>
  ),
}));
vi.mock("@/shared/components/AgendaDayPanel", () => ({
  AgendaDayPanel: ({
    items,
    onSelectFreeSlot,
    onCancelBookedSlot,
    onCompleteBookedSlot,
  }: {
    items: Array<{
      officeId: string;
      freeSlots: string[];
      blockedSlots?: Array<unknown>;
      fullDayBlocked?: boolean;
    }>;
    onSelectFreeSlot?: (slot: { time: string; officeId: string; officeName?: string }) => void;
    onCancelBookedSlot?: (appointmentId: string) => void;
    onCompleteBookedSlot?: (appointmentId: string) => void;
  }) => (
    <div>
      <div data-testid="day-items-count">{items.length}</div>
      <div data-testid="day-free-slot-count">
        {items.reduce((sum, item) => sum + item.freeSlots.length, 0)}
      </div>
      <div data-testid="day-blocked-slot-count">
        {items.reduce((sum, item) => sum + (item.blockedSlots?.length ?? 0), 0)}
      </div>
      <div data-testid="day-full-day-count">{items.filter((item) => item.fullDayBlocked).length}</div>
      <div data-testid="day-office-ids">{items.map((item) => item.officeId).join(",")}</div>
      <button
        type="button"
        onClick={() =>
          onSelectFreeSlot?.({
            time: "09:00",
            officeId: "office-1",
            officeName: "Consultorio Centro",
          })
        }
      >
        Seleccionar slot libre
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectFreeSlot?.({
            time: "10:00",
            officeId: "office-2",
            officeName: "Consultorio Norte",
          })
        }
      >
        Seleccionar slot libre norte
      </button>
      <button
        type="button"
        onClick={() =>
          onSelectFreeSlot?.({
            time: "11:00",
            officeId: "office-1",
          })
        }
      >
        Seleccionar slot sin consultorio
      </button>
      <button type="button" onClick={() => onCancelBookedSlot?.("appointment-1")}>
        Cancelar desde agenda
      </button>
      <button type="button" onClick={() => onCompleteBookedSlot?.("appointment-1")}>
        Completar desde agenda
      </button>
    </div>
  ),
}));
vi.mock("@/shared/components/BookAppointmentModal", () => ({
  BookAppointmentModal: ({
    isOpen,
    description,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    description?: string;
    onConfirm: (patient: {
      id: string;
      fullName: string;
      coverage: string;
      document: string;
      email: string;
      phone: string;
      meta: string;
      isLinked: boolean;
    }) => Promise<void> | void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <span>{description}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await onConfirm({
                id: "patient-new",
                fullName: "Paciente Nuevo",
                coverage: "OSDE",
                document: "30111222",
                email: "nuevo@example.com",
                phone: "",
                meta: "nuevo@example.com",
                isLinked: false,
              });
            } catch {
              return;
            }
            onClose();
          }}
        >
          Confirmar turno modal
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await onConfirm({
                id: "patient-linked",
                fullName: "Paciente Vinculado",
                coverage: "Swiss Medical",
                document: "30999888",
                email: "vinculado@example.com",
                phone: "",
                meta: "vinculado@example.com",
                isLinked: true,
              });
            } catch {
              return;
            }
            onClose();
          }}
        >
          Confirmar turno vinculado
        </button>
        <button type="button" onClick={onClose}>
          Cerrar modal
        </button>
      </div>
    ) : null,
}));

import { ProfessionalDashboardPage } from "@/modules/professional/dashboard/ProfessionalDashboardPage";
import { ProfessionalSchedulePage } from "@/modules/professional/schedule/ProfessionalSchedulePage";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const offices = [
  {
    id: "office-1",
    professionalId: "professional-88",
    name: "Consultorio Centro",
    address: "Calle 1",
    phone: null,
    appointmentDuration: 30,
    schedules: [
      {
        dayOfWeek: new Date().getDay(),
        startTime: "09:00:00",
        endTime: "12:00:00",
        isActive: true,
      },
    ],
  },
  {
    id: "office-2",
    professionalId: "professional-88",
    name: "Consultorio Norte",
    address: "Calle 2",
    phone: null,
    appointmentDuration: 30,
    schedules: [
      {
        dayOfWeek: new Date().getDay(),
        startTime: "10:00:00",
        endTime: "13:00:00",
        isActive: true,
      },
    ],
  },
];

const dashboardAppointments = [
  {
    id: "appointment-1",
    patientId: "patient-1",
    professionalId: "professional-88",
    officeId: "office-1",
    date: getToday(),
    time: "09:00:00",
    duration: 30,
    status: "confirmed",
    reason: "Control general",
    notes: null,
    cancellationReason: null,
    createdAt: "2099-01-01T00:00:00.000Z",
    updatedAt: "2099-01-01T00:00:00.000Z",
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
    id: "appointment-2",
    patientId: "patient-2",
    professionalId: "professional-88",
    officeId: "office-2",
    date: getToday(),
    time: "10:00:00",
    duration: 30,
    status: "pending",
    reason: "Seguimiento",
    notes: null,
    cancellationReason: null,
    createdAt: "2099-01-01T00:00:00.000Z",
    updatedAt: "2099-01-01T00:00:00.000Z",
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
      id: "office-2",
      name: "Consultorio Norte",
    },
  },
];

describe("professional pages", () => {
  beforeEach(() => {
    authMocks.useAuth.mockReset();
    appointmentsApiMocks.getProfessionalAppointments.mockReset();
    appointmentsApiMocks.cancelAppointment.mockReset();
    appointmentsApiMocks.completeAppointment.mockReset();
    appointmentsApiMocks.createAppointment.mockReset();
    professionalApiMocks.getProfessionalOfficesData.mockReset();
    professionalApiMocks.getOfficeBlocks.mockReset();
    dateUtilsMocks.isPastScheduleSlot.mockReset();

    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "professional",
        professionalId: "professional-88",
      }),
    });
    professionalApiMocks.getProfessionalOfficesData.mockResolvedValue(offices);
    professionalApiMocks.getOfficeBlocks.mockResolvedValue([]);
  });

  it("filters the dashboard by office and cancels appointments from the visible list", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);
    appointmentsApiMocks.cancelAppointment.mockResolvedValue(undefined);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    expect(screen.getByText("Luis Perez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox"), "office-2");

    await waitFor(() => {
      expect(screen.getByText("Luis Perez")).toBeInTheDocument();
    });

    expect(screen.queryByText("Ana Lopez")).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar turno" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledWith(
        "appointment-2",
        "Cancelado desde inicio del profesional",
      );
    });

    expect(screen.getByText("Turno cancelado correctamente.")).toBeInTheDocument();
  });

  it("completes appointments from the dashboard when the slot is in the past", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);
    appointmentsApiMocks.completeAppointment.mockResolvedValue(undefined);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Completar" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledWith("appointment-1");
    });

    expect(screen.getByText("Turno completado correctamente.")).toBeInTheDocument();
  });

  it("shows dashboard fallback labels when office or reason are missing", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([
      {
        ...dashboardAppointments[0],
        office: undefined,
        reason: null,
      },
    ]);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    expect(screen.getByText("Consultorio")).toBeInTheDocument();
    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Completar" })).not.toBeInTheDocument();
  });

  it("shows dashboard loading feedback while its queries are pending", () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<ProfessionalDashboardPage />);

    expect(screen.getByText("Cargando inicio...")).toBeInTheDocument();
  });

  it("shows dashboard error feedback when the query fails", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockRejectedValue(new Error("boom"));

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar el inicio.")).toBeInTheDocument();
    });
  });

  it("shows the dashboard fallback when the session has no professional id", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    authMocks.useAuth.mockReturnValue({ user: null });

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar el inicio.")).toBeInTheDocument();
    });

    expect(appointmentsApiMocks.getProfessionalAppointments).not.toHaveBeenCalled();
    expect(professionalApiMocks.getProfessionalOfficesData).not.toHaveBeenCalled();
  });

  it("shows the empty-state dashboard copy and hides unavailable actions", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([
      {
        ...dashboardAppointments[0],
        id: "appointment-completed",
        status: "completed",
        patientId: null,
      },
    ]);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Completar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar turno" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver paciente" })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox"), "office-2");

    await waitFor(() => {
      expect(screen.getByText("No hay turnos para hoy con ese consultorio.")).toBeInTheDocument();
    });
  });

  it("shows dashboard mutation errors and lets the user dismiss feedback", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);
    appointmentsApiMocks.cancelAppointment.mockRejectedValue(new Error("No se pudo cancelar desde dashboard."));
    appointmentsApiMocks.completeAppointment.mockRejectedValue(new Error("No se pudo completar desde dashboard."));

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar turno" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo cancelar desde dashboard.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("No se pudo cancelar desde dashboard.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo completar desde dashboard.")).toBeInTheDocument();
    });
  });

  it("shows dashboard fallback messages for non-Error mutation failures", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);
    appointmentsApiMocks.cancelAppointment.mockRejectedValue("fallo");
    appointmentsApiMocks.completeAppointment.mockRejectedValue(500);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar turno" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo cancelar el turno.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo completar el turno.")).toBeInTheDocument();
    });
  });

  it("closes dashboard confirm dialogs without mutating when the user backs out", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar turno" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar Cancelar turno" }));
    expect(screen.queryByRole("button", { name: "Confirmar Cancelar turno" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar Completar turno" }));
    expect(screen.queryByRole("button", { name: "Confirmar Completar turno" })).not.toBeInTheDocument();

    expect(appointmentsApiMocks.cancelAppointment).not.toHaveBeenCalled();
    expect(appointmentsApiMocks.completeAppointment).not.toHaveBeenCalled();
  });

  it("prevents duplicate dashboard mutations while a confirmation stays pending", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue(dashboardAppointments);

    let resolveCancel: (() => void) | undefined;
    appointmentsApiMocks.cancelAppointment.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCancel = resolve;
        }),
    );

    let resolveComplete: (() => void) | undefined;
    appointmentsApiMocks.completeAppointment.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveComplete = resolve;
        }),
    );

    renderWithProviders(<ProfessionalDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole("button", { name: "Cancelar turno" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));
    expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledTimes(1);
    resolveCancel?.();

    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));
    expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledTimes(1);
    resolveComplete?.();
  });

  it("blocks scheduling past slots from the professional schedule", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre" }));

    await waitFor(() => {
      expect(screen.getByText(/ya paso y no se puede agendar/i)).toBeInTheDocument();
    });

    expect(appointmentsApiMocks.createAppointment).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Confirmar turno modal" })).not.toBeInTheDocument();
  });

  it("creates appointments from the professional schedule and shows first-link feedback", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    appointmentsApiMocks.createAppointment.mockResolvedValue({ id: "appointment-created" });

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar turno modal" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno modal" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.createAppointment).toHaveBeenCalledWith({
        patientId: "patient-new",
        officeId: "office-1",
        date: getToday(),
        time: "09:00",
      });
    });

    expect(screen.getByText(/primer vinculo registrado/i)).toBeInTheDocument();
  });

  it("creates linked appointments, toggles month navigation, and shows office-specific feedback", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    appointmentsApiMocks.createAppointment.mockResolvedValue({ id: "appointment-linked" });

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mes anterior" })).not.toBeDisabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));

    await userEvent.click(screen.getByRole("button", { name: "Ir a hoy" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre norte" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar turno vinculado" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno vinculado" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.createAppointment).toHaveBeenCalledWith({
        patientId: "patient-linked",
        officeId: "office-2",
        date: getToday(),
        time: "10:00",
      });
    });

    expect(
      screen.getByText(/turno creado para paciente vinculado.*consultorio norte/i),
    ).toBeInTheDocument();
  });

  it("shows loading feedback while the professional schedule queries are pending", () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<ProfessionalSchedulePage />);

    expect(screen.getByText("Cargando agenda...")).toBeInTheDocument();
  });

  it("renders an empty schedule when the professional has no offices configured", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    professionalApiMocks.getProfessionalOfficesData.mockResolvedValue([]);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    expect(screen.getByTestId("calendar-agenda-count")).toHaveTextContent("0");
    expect(professionalApiMocks.getOfficeBlocks).not.toHaveBeenCalled();
  });

  it("shows the schedule fallback when the session has no professional id", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    authMocks.useAuth.mockReturnValue({ user: null });

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar la agenda.")).toBeInTheDocument();
    });

    expect(appointmentsApiMocks.getProfessionalAppointments).not.toHaveBeenCalled();
    expect(professionalApiMocks.getProfessionalOfficesData).not.toHaveBeenCalled();
  });

  it("shows schedule errors and propagates create, cancel and complete failures", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    appointmentsApiMocks.createAppointment.mockRejectedValue(new Error("No se pudo crear desde API."));
    appointmentsApiMocks.cancelAppointment.mockRejectedValue(new Error("No se pudo cancelar desde API."));
    appointmentsApiMocks.completeAppointment.mockRejectedValue(new Error("No se pudo completar desde API."));

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar turno modal" })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno modal" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo crear desde API.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("No se pudo crear desde API.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo cancelar desde API.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Completar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo completar desde API.")).toBeInTheDocument();
    });
  });

  it("shows schedule fallback messages for non-Error mutation failures", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    appointmentsApiMocks.createAppointment.mockRejectedValue("fallo");
    appointmentsApiMocks.cancelAppointment.mockRejectedValue(500);
    appointmentsApiMocks.completeAppointment.mockRejectedValue(null);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno modal" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo crear el turno.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo cancelar el turno.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Completar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo completar el turno.")).toBeInTheDocument();
    });
  });

  it("rejects a schedule slot that becomes past during confirmation", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot libre" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirmar turno modal" })).toBeInTheDocument();
    });

    dateUtilsMocks.isPastScheduleSlot.mockReset();
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);

    await userEvent.click(screen.getByRole("button", { name: "Confirmar turno modal" }));

    await waitFor(() => {
      expect(screen.getByText(/ya paso y no se puede agendar/i)).toBeInTheDocument();
    });

    expect(appointmentsApiMocks.createAppointment).not.toHaveBeenCalled();
  });

  it("describes schedule slots even when the selected office name is missing", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar slot sin consultorio" }));

    expect(screen.getByText(`Horario seleccionado ${getToday()} 11:00`)).toBeInTheDocument();
    expect(screen.queryByText(/en undefined/i)).not.toBeInTheDocument();
  });

  it("shows success feedback when cancelling and completing from the professional schedule", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    appointmentsApiMocks.cancelAppointment.mockResolvedValue(undefined);
    appointmentsApiMocks.completeAppointment.mockResolvedValue(undefined);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancelar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledWith(
        "appointment-1",
        "Cancelado desde agenda del profesional",
      );
    });

    expect(screen.getByText(/turno cancelado para el/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Completar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledWith("appointment-1");
    });

    expect(screen.getByText(/turno marcado como completado para el/i)).toBeInTheDocument();
  });

  it("closes schedule confirm dialogs without mutating when the user backs out", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancelar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar Cancelar turno" }));
    expect(screen.queryByRole("button", { name: "Confirmar Cancelar turno" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Completar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar Completar turno" }));
    expect(screen.queryByRole("button", { name: "Confirmar Completar turno" })).not.toBeInTheDocument();

    expect(appointmentsApiMocks.cancelAppointment).not.toHaveBeenCalled();
    expect(appointmentsApiMocks.completeAppointment).not.toHaveBeenCalled();
  });

  it("prevents duplicate schedule mutations while a confirmation stays pending", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);

    let resolveCancel: (() => void) | undefined;
    appointmentsApiMocks.cancelAppointment.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCancel = resolve;
        }),
    );

    let resolveComplete: (() => void) | undefined;
    appointmentsApiMocks.completeAppointment.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveComplete = resolve;
        }),
    );

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("MonthCalendar mock")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancelar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar Cancelar turno" }));
    expect(appointmentsApiMocks.cancelAppointment).toHaveBeenCalledTimes(1);
    resolveCancel?.();

    await userEvent.click(screen.getByRole("button", { name: "Completar desde agenda" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));

    await waitFor(() => {
      expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirmar Completar turno" }));
    expect(appointmentsApiMocks.completeAppointment).toHaveBeenCalledTimes(1);
    resolveComplete?.();
  });

  it("applies office filters and block summaries while navigating the calendar", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockResolvedValue([]);
    professionalApiMocks.getOfficeBlocks.mockImplementation(async (officeId: string) => {
      const today = getToday();
      if (officeId === "office-1") {
        return [
          {
            id: "block-range-1",
            officeId,
            date: today,
            type: "time_range",
            startTime: "09:00:00",
            endTime: "10:00:00",
            reason: "Reunion",
          },
        ];
      }

      return [
        {
          id: "block-full-1",
          officeId,
          date: today,
          type: "full_day",
          startTime: null,
          endTime: null,
          reason: "Congreso",
        },
      ];
    });

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("day-items-count")).toHaveTextContent("2");
    });

    expect(screen.getByTestId("day-blocked-slot-count")).toHaveTextContent("2");
    expect(screen.getByTestId("day-full-day-count")).toHaveTextContent("1");
    expect(screen.getByTestId("calendar-agenda-count")).not.toHaveTextContent("0");
    expect(professionalApiMocks.getOfficeBlocks).toHaveBeenCalledTimes(2);

    await userEvent.selectOptions(screen.getByRole("combobox"), "office-2");

    await waitFor(() => {
      expect(screen.getByTestId("day-items-count")).toHaveTextContent("1");
    });

    expect(screen.getByTestId("day-office-ids")).toHaveTextContent("office-2");
    expect(screen.getByTestId("calendar-office-filter")).toHaveTextContent("office-2");

    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));

    await waitFor(() => {
      expect(professionalApiMocks.getOfficeBlocks).toHaveBeenCalledTimes(4);
    });

    await userEvent.click(screen.getByRole("button", { name: "Ir a hoy" }));
    expect(screen.getByTestId("calendar-selected-date")).toHaveTextContent(getToday());
  });

  it("renders the fallback message when the schedule query fails", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);
    appointmentsApiMocks.getProfessionalAppointments.mockRejectedValue(new Error("boom"));

    renderWithProviders(<ProfessionalSchedulePage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar la agenda.")).toBeInTheDocument();
    });
  });
});
