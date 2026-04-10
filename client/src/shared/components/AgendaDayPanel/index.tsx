import { Link } from "react-router-dom";
import type { AgendaDay } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";

interface AgendaDayPanelProps {
  title?: string;
  dateLabel?: string;
  items: AgendaDay[];
  mode?: "default" | "special" | "patient";
  onSelectFreeSlot?: (slot: string) => void;
}

export function AgendaDayPanel({
  title = "Turnos del dia",
  dateLabel,
  items,
  mode = "default",
  onSelectFreeSlot,
}: AgendaDayPanelProps) {
  const booked = items.flatMap((item) => item.bookedSlots);
  const free = items.flatMap((item) => item.freeSlots);
  const isWorkingDay = items.length > 0;
  const rows = [
    ...booked.map((item) => ({
      id: item.id,
      time: new Date(item.date).toLocaleTimeString("es-AR", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      }),
      title:
        mode === "special"
          ? "Agendado"
          : mode === "patient"
            ? "Horario ocupado"
            : item.patientName,
      subtitle:
        mode === "special"
          ? "Turno reservado"
          : mode === "patient"
            ? "No disponible"
            : item.reason,
      patientId: item.patientId,
      kind: "Agendado",
    })),
    ...free.map((slot) => ({
      id: `free-${slot}`,
      time: slot,
      title: mode === "special" ? "Libre" : "Horario libre",
      subtitle: mode === "special" ? "Disponible para bloquear" : "Disponible",
      patientId: undefined,
      kind: "Libre",
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <aside className="calendar-side">
      <section className="panel panel-separated stack-md">
        <div className="calendar-panel-header">
          <h3 className="title-md">{title}</h3>
          {dateLabel ? <span className="meta">{dateLabel}</span> : null}
        </div>

        {!isWorkingDay ? (
          <div className="stack-sm">
            <strong>No se atiende este dia</strong>
            <span className="meta">Selecciona otro dia del calendario.</span>
          </div>
        ) : (
          <div className="slot-stack slot-stack-scroll">
            {mode === "special" ? (
              <div className="form-actions">
                {booked.length ? (
                  <Button variant="ghost" className="button-inline">
                    Cancelar dia
                  </Button>
                ) : (
                  <Button variant="ghost" className="button-inline">
                    Bloquear dia
                  </Button>
                )}
              </div>
            ) : null}

            {rows.length ? (
              rows.map((row) => (
                <div key={row.id} className="slot-entry agenda-entry">
                  <div className="slot-entry-main agenda-entry-main">
                    <strong>{row.title}</strong>
                    <span className="slot-entry-meta">{row.subtitle}</span>
                  </div>

                  <div className="slot-entry-actions agenda-entry-side">
                    <span className="slot-entry-time">{row.time}</span>
                    {mode === "special" ? (
                      row.kind === "Agendado" ? (
                        <Button variant="ghost" className="button-inline">
                          Cancelar
                        </Button>
                      ) : (
                        <Button variant="ghost" className="button-inline">
                          Bloquear
                        </Button>
                      )
                    ) : row.kind === "Libre" && onSelectFreeSlot ? (
                      <Button
                        variant="ghost"
                        className="button-inline"
                        onClick={() => onSelectFreeSlot(row.time)}
                      >
                        Agendar
                      </Button>
                    ) : mode === "patient" ? null : row.patientId ? (
                      <Link to={`/professional/patients/${row.patientId}`}>
                        <Button variant="ghost" className="button-inline">
                          Ver
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <span className="meta">Sin turnos registrados.</span>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
