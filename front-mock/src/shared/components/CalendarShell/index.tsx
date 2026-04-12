import type { ReactNode } from "react";

interface CalendarShellProps {
  controls: ReactNode;
  calendar: ReactNode;
  sidebar: ReactNode;
}

export function CalendarShell({ controls, calendar, sidebar }: CalendarShellProps) {
  return (
    <div className="stack-md">
      {controls}
      <div className="calendar-shell">
        <div className="calendar-column">{calendar}</div>
        <div className="calendar-column">{sidebar}</div>
      </div>
    </div>
  );
}
