import type { AgendaDay } from "@/shared/types/domain";

export interface CalendarDayCell {
  key: string;
  date: string | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
  freeCount: number;
  bookedCount: number;
}

export const weekdayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export function buildMonthCells(
  year: number,
  month: number,
  agenda: AgendaDay[],
  officeId?: string,
): CalendarDayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const jsFirstDay = firstDay.getDay();
  const startOffset = jsFirstDay === 0 ? 6 : jsFirstDay - 1;
  const daysInMonth = lastDay.getDate();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({
      key: `empty-start-${i}`,
      date: null,
      dayNumber: null,
      isCurrentMonth: false,
      freeCount: 0,
      bookedCount: 0,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const items = agenda.filter(
      (entry) => entry.date === isoDate && (!officeId || entry.officeId === officeId),
    );
    const freeCount = items.reduce((sum, item) => sum + item.freeSlots.length, 0);
    const bookedCount = items.reduce((sum, item) => sum + item.bookedSlots.length, 0);

    cells.push({
      key: isoDate,
      date: isoDate,
      dayNumber: day,
      isCurrentMonth: true,
      freeCount,
      bookedCount,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      date: null,
      dayNumber: null,
      isCurrentMonth: false,
      freeCount: 0,
      bookedCount: 0,
    });
  }

  return cells;
}

export function getAgendaForDate(
  agenda: AgendaDay[],
  date: string,
  officeId?: string,
) {
  return agenda.filter(
    (entry) => entry.date === date && (!officeId || entry.officeId === officeId),
  );
}
