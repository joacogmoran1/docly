import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildMonthCells, weekdayLabels } from "@/shared/utils/agenda";
import type { AgendaDay } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";

interface MonthCalendarProps {
  agenda: AgendaDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  officeId?: string;
  year: number;
  month: number;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onGoToday?: () => void;
  canGoPrevious?: boolean;
  centerContent?: ReactNode;
}

export function MonthCalendar({
  agenda,
  selectedDate,
  onSelectDate,
  officeId,
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  onGoToday,
  canGoPrevious = true,
  centerContent,
}: MonthCalendarProps) {
  const cells = buildMonthCells(year, month, agenda, officeId);
  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  return (
    <div className="month-calendar stack-md">
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h2 className="title-lg calendar-month-label">{monthLabel}</h2>
        </div>
        <div className="calendar-header-center">{centerContent}</div>
        <div className="calendar-header-right">
          {onNextMonth || onGoToday || onPreviousMonth ? (
            <div className="calendar-toolbar">
              {onPreviousMonth ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="calendar-nav-button"
                  onClick={onPreviousMonth}
                  disabled={!canGoPrevious}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={16} />
                </Button>
              ) : null}
              {onGoToday ? (
                <Button variant="ghost" type="button" className="calendar-today-button" onClick={onGoToday}>
                  Hoy
                </Button>
              ) : null}
              {onNextMonth ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="calendar-nav-button"
                  onClick={onNextMonth}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={16} />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="month-grid-head">
        {weekdayLabels.map((label) => (
          <div key={label} className="weekday-label">
            {label}
          </div>
        ))}
      </div>

      <div className="month-grid-body">
        {cells.map((cell) => {
          const hasAttention = cell.bookedCount > 0 || cell.freeCount > 0;

          return (
            <button
              key={cell.key}
              type="button"
              className={`day-cell${cell.date === selectedDate ? " is-selected" : ""}${!cell.isCurrentMonth ? " is-muted" : ""}`}
              onClick={() => cell.date && onSelectDate(cell.date)}
              disabled={!cell.date}
            >
              <span className="day-number">{cell.dayNumber ?? ""}</span>
              {cell.date && hasAttention ? (
                <div className="stack-sm">
                  <span className="day-meta">{cell.bookedCount} ocupados</span>
                  <span className="day-meta">{cell.freeCount} libres</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
