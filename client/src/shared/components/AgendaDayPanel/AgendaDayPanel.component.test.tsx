import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgendaDay } from "@/shared/types/domain";

const dateUtilsMocks = vi.hoisted(() => ({
  isPastScheduleSlot: vi.fn(),
}));

vi.mock("@/shared/utils/date", async () => {
  const actual = await vi.importActual<typeof import("@/shared/utils/date")>("@/shared/utils/date");
  return {
    ...actual,
    isPastScheduleSlot: dateUtilsMocks.isPastScheduleSlot,
  };
});

import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";

describe("AgendaDayPanel", () => {
  beforeEach(() => {
    dateUtilsMocks.isPastScheduleSlot.mockReset();
  });

  it("renders booked, blocked and free rows and fires the expected actions", async () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(true);
    const onSelectFreeSlot = vi.fn();
    const onCancelBookedSlot = vi.fn();
    const onCompleteBookedSlot = vi.fn();

    const items: AgendaDay[] = [
      {
        date: "2099-03-10",
        officeId: "office-1",
        officeName: "Consultorio Centro",
        freeSlots: ["11:00"],
        blockedSlots: [
          {
            id: "blocked-1",
            blockId: "block-1",
            time: "10:30",
            officeId: "office-1",
            officeName: "Consultorio Centro",
            reason: "Reunion",
          },
        ],
        bookedSlots: [
          {
            id: "appointment-1",
            officeId: "office-1",
            officeName: "Consultorio Centro",
            patientId: "patient-1",
            patientName: "Ana Lopez",
            date: "2099-03-10T09:00:00",
            status: "Confirmado",
            reason: "Control general",
          },
        ],
      },
    ];

    render(
      <MemoryRouter>
        <AgendaDayPanel
          selectedDate="2099-03-10"
          dateLabel="10/03/2099"
          items={items}
          onSelectFreeSlot={onSelectFreeSlot}
          onCancelBookedSlot={onCancelBookedSlot}
          onCompleteBookedSlot={onCompleteBookedSlot}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Ana Lopez")).toBeInTheDocument();
    expect(screen.getByText("Horario bloqueado")).toBeInTheDocument();
    expect(screen.getByText("Horario libre")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar turno" }));
    expect(onCancelBookedSlot).toHaveBeenCalledWith("appointment-1");

    await userEvent.click(screen.getByRole("button", { name: "Completar" }));
    expect(onCompleteBookedSlot).toHaveBeenCalledWith("appointment-1");

    await userEvent.click(screen.getByRole("button", { name: "Agendar" }));
    expect(onSelectFreeSlot).toHaveBeenCalledWith({
      time: "11:00",
      officeId: "office-1",
      officeName: "Consultorio Centro",
    });

    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute(
      "href",
      "/professional/patients/patient-1",
    );
  });

  it("shows the full-day blocked state and day action in special mode", async () => {
    const onDayAction = vi.fn();

    render(
      <AgendaDayPanel
        mode="special"
        items={[
          {
            date: "2099-03-11",
            officeId: "office-2",
            officeName: "Consultorio Norte",
            freeSlots: [],
            bookedSlots: [],
            blockedSlots: [],
            fullDayBlocked: true,
            fullDayBlockId: "block-day-1",
            fullDayBlockReason: "Congreso",
          },
        ]}
        dayActionLabel="Desbloquear dia"
        onDayAction={onDayAction}
      />,
    );

    expect(screen.getByText("Este dia no se atiende")).toBeInTheDocument();
    expect(screen.getByText("Motivo: Congreso")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Desbloquear dia" }));
    expect(onDayAction).toHaveBeenCalled();
  });

  it("renders patient mode labels and hides professional-only actions", () => {
    dateUtilsMocks.isPastScheduleSlot.mockReturnValue(false);

    render(
      <MemoryRouter>
        <AgendaDayPanel
          mode="patient"
          selectedDate="2099-03-10"
          items={[
            {
              date: "2099-03-10",
              officeId: "office-1",
              officeName: "Consultorio Centro",
              freeSlots: ["11:00"],
              blockedSlots: [
                {
                  id: "blocked-1",
                  blockId: "block-1",
                  time: "10:30",
                  officeId: "office-1",
                  officeName: "Consultorio Centro",
                  reason: undefined,
                },
              ],
              bookedSlots: [
                {
                  id: "appointment-1",
                  officeId: "office-1",
                  officeName: "Consultorio Centro",
                  patientId: "patient-1",
                  patientName: "Ana Lopez",
                  date: "2099-03-10T09:00:00",
                  status: "Pendiente",
                  reason: "Control general",
                },
              ],
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Horario ocupado")).toBeInTheDocument();
    expect(screen.getByText("No disponible")).toBeInTheDocument();
    expect(screen.getByText("Disponible en Consultorio Centro")).toBeInTheDocument();
    expect(screen.getByText("No disponible para agendar")).toBeInTheDocument();
    expect(screen.getByText("Bloqueado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar turno" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Completar" })).not.toBeInTheDocument();
  });

  it("supports block and unblock actions in special mode and shows default day labels", async () => {
    const onBlockFreeSlot = vi.fn();
    const onUnblockBlockedSlot = vi.fn();
    const onDayAction = vi.fn();

    render(
      <AgendaDayPanel
        mode="special"
        items={[
          {
            date: "2099-03-12",
            officeId: "office-3",
            officeName: "Consultorio Sur",
            freeSlots: ["08:30"],
            blockedSlots: [
              {
                id: "blocked-2",
                blockId: "block-2",
                time: "08:00",
                officeId: "office-3",
                officeName: "Consultorio Sur",
                reason: "Capacitacion",
              },
            ],
            bookedSlots: [],
          },
        ]}
        onBlockFreeSlot={onBlockFreeSlot}
        onUnblockBlockedSlot={onUnblockBlockedSlot}
        onDayAction={onDayAction}
      />,
    );

    expect(screen.getByRole("button", { name: "Bloquear dia" })).toBeInTheDocument();
    expect(screen.queryByText("Agendado")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bloquear dia" }));
    expect(onDayAction).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    expect(onBlockFreeSlot).toHaveBeenCalledWith({
      time: "08:30",
      officeId: "office-3",
      officeName: "Consultorio Sur",
    });

    await userEvent.click(screen.getByRole("button", { name: "Desbloquear" }));
    expect(onUnblockBlockedSlot).toHaveBeenCalledWith({
      blockId: "block-2",
      time: "08:00",
      officeId: "office-3",
      officeName: "Consultorio Sur",
      reason: "Capacitacion",
    });
  });

  it("unblocks special rows without a reason using the undefined reason fallback", async () => {
    const onUnblockBlockedSlot = vi.fn();

    render(
      <AgendaDayPanel
        mode="special"
        items={[
          {
            date: "2099-03-12",
            officeId: "office-3",
            officeName: "Consultorio Sur",
            freeSlots: [],
            blockedSlots: [
              {
                id: "blocked-2",
                blockId: "block-2",
                time: "08:00",
                officeId: "office-3",
                officeName: "Consultorio Sur",
                reason: undefined,
              },
            ],
            bookedSlots: [],
          },
        ]}
        onUnblockBlockedSlot={onUnblockBlockedSlot}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Desbloquear" }));

    expect(onUnblockBlockedSlot).toHaveBeenCalledWith({
      blockId: "block-2",
      time: "08:00",
      officeId: "office-3",
      officeName: "Consultorio Sur",
      reason: undefined,
    });
  });

  it("covers special booked rows and disabled fallback actions", async () => {
    const onDayAction = vi.fn();

    render(
      <MemoryRouter>
        <AgendaDayPanel
          mode="special"
          dayActionDisabled
          items={[
            {
              date: "2099-03-12",
              officeId: "office-3",
              freeSlots: ["08:30"],
              blockedSlots: [
                {
                  id: "blocked-2",
                  blockId: "block-2",
                  time: "08:00",
                  officeId: "office-3",
                  reason: undefined,
                },
              ],
              bookedSlots: [
                {
                  id: "appointment-2",
                  officeId: "office-3",
                  officeName: "Consultorio Sur",
                  patientId: "patient-2",
                  patientName: "Paciente reservado",
                  date: "2099-03-12T09:00:00",
                  status: "Pendiente",
                  reason: "Control",
                },
              ],
            },
          ]}
          onDayAction={onDayAction}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(screen.getByText("Turno reservado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar dia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bloquear" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar dia" }));
    expect(onDayAction).not.toHaveBeenCalled();
  });

  it("uses full-day fallback labels and hides day actions outside special mode", () => {
    const { rerender } = render(
      <AgendaDayPanel
        items={[
          {
            date: "2099-03-12",
            officeId: "office-3",
            officeName: "Consultorio Sur",
            freeSlots: [],
            bookedSlots: [],
            fullDayBlocked: true,
          },
        ]}
      />,
    );

    expect(screen.getByText("Este dia no se atiende")).toBeInTheDocument();
    expect(screen.queryByText(/Motivo:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desbloquear dia" })).not.toBeInTheDocument();

    rerender(
      <AgendaDayPanel
        mode="special"
        items={[
          {
            date: "2099-03-12",
            officeId: "office-3",
            officeName: "Consultorio Sur",
            freeSlots: [],
            bookedSlots: [],
            fullDayBlocked: true,
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Desbloquear dia" })).toBeInTheDocument();
  });

  it("handles default rows without optional callbacks or optional slot arrays", () => {
    render(
      <MemoryRouter>
        <AgendaDayPanel
          items={[
            {
              date: "2099-03-14",
              officeId: "office-4",
              freeSlots: ["10:00"],
              bookedSlots: [
                {
                  id: "appointment-3",
                  officeId: "office-4",
                  officeName: "Consultorio Oeste",
                  patientId: undefined,
                  patientName: "Paciente sin ficha",
                  date: "2099-03-14T09:00:00",
                  status: "Completado",
                  reason: "Seguimiento",
                },
              ],
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Paciente sin ficha")).toBeInTheDocument();
    expect(screen.getByText("Horario libre")).toBeInTheDocument();
    expect(screen.getAllByText("Disponible").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Cancelar turno" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Completar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agendar" })).not.toBeInTheDocument();
  });

  it("shows non-working days and empty working days with the expected copy", () => {
    const { rerender } = render(<AgendaDayPanel items={[]} />);

    expect(screen.getByText("No se atiende este dia")).toBeInTheDocument();

    rerender(
      <AgendaDayPanel
        items={[
          {
            date: "2099-03-13",
            officeId: "office-1",
            officeName: "Consultorio Centro",
            freeSlots: [],
            blockedSlots: [],
            bookedSlots: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("Sin turnos registrados.")).toBeInTheDocument();
  });
});
