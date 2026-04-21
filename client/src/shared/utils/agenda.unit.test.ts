import { describe, expect, it } from "vitest";
import { buildMonthCells, getAgendaForDate } from "@/shared/utils/agenda";
import type { AgendaDay } from "@/shared/types/domain";

const agenda: AgendaDay[] = [
  {
    date: "2024-02-05",
    officeId: "office-1",
    officeName: "Centro",
    freeSlots: ["09:00", "09:30"],
    bookedSlots: [
      {
        id: "appointment-1",
        officeId: "office-1",
        patientName: "Ana",
        officeName: "Centro",
        date: "2024-02-05T09:00:00",
        status: "Confirmado",
        reason: "Control",
      },
    ],
    blockedSlots: [],
    fullDayBlocked: false,
  },
  {
    date: "2024-02-05",
    officeId: "office-2",
    officeName: "Norte",
    freeSlots: ["10:00"],
    bookedSlots: [
      {
        id: "appointment-2",
        officeId: "office-2",
        patientName: "Luis",
        officeName: "Norte",
        date: "2024-02-05T10:00:00",
        status: "Confirmado",
        reason: "Control",
      },
      {
        id: "appointment-3",
        officeId: "office-2",
        patientName: "Sofi",
        officeName: "Norte",
        date: "2024-02-05T10:30:00",
        status: "Pendiente",
        reason: "Seguimiento",
      },
    ],
    blockedSlots: [],
    fullDayBlocked: false,
  },
];

describe("agenda utils", () => {
  it("builds month cells with empty leading cells and aggregated counts", () => {
    const cells = buildMonthCells(2024, 1, agenda);

    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 3).every((cell) => cell.date === null)).toBe(true);

    const february5 = cells.find((cell) => cell.date === "2024-02-05");
    expect(february5).toMatchObject({
      dayNumber: 5,
      freeCount: 3,
      bookedCount: 3,
      isCurrentMonth: true,
    });
  });

  it("filters month counts and day agenda by office", () => {
    const filteredCells = buildMonthCells(2024, 1, agenda, "office-1");
    const february5 = filteredCells.find((cell) => cell.date === "2024-02-05");

    expect(february5).toMatchObject({
      freeCount: 2,
      bookedCount: 1,
    });

    expect(getAgendaForDate(agenda, "2024-02-05", "office-2")).toHaveLength(1);
    expect(getAgendaForDate(agenda, "2024-02-05")[0]?.officeId).toBe("office-1");
  });

  it("pads sunday-starting months and keeps empty days at zero", () => {
    const cells = buildMonthCells(2026, 2, []);

    expect(cells).toHaveLength(42);
    expect(cells.slice(0, 6).every((cell) => cell.date === null)).toBe(true);
    expect(cells[6]).toMatchObject({
      date: "2026-03-01",
      dayNumber: 1,
      freeCount: 0,
      bookedCount: 0,
      isCurrentMonth: true,
    });

    const march31 = cells.find((cell) => cell.date === "2026-03-31");
    expect(march31).toMatchObject({
      freeCount: 0,
      bookedCount: 0,
    });
    expect(cells.slice(-5).every((cell) => cell.date === null)).toBe(true);
  });

  it("returns empty arrays when the date or office filter does not match", () => {
    expect(getAgendaForDate(agenda, "2024-02-06")).toEqual([]);
    expect(getAgendaForDate(agenda, "2024-02-05", "office-missing")).toEqual([]);
  });
});
