import { Link } from "react-router-dom";
import type { AgendaDay } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";

interface AgendaDayPanelProps {
  title?: string;
  dateLabel?: string;
  items: AgendaDay[];
  mode?: "default" | "special" | "patient";
  onSelectFreeSlot?: (slot: { time: string; officeId: string; officeName?: string }) => void;
  onCancelBookedSlot?: (appointmentId: string) => void;
  onCompleteBookedSlot?: (appointmentId: string) => void;
  onBlockFreeSlot?: (slot: { time: string; officeId: string; officeName?: string }) => void;
  onUnblockBlockedSlot?: (slot: {
    blockId: string;
    time: string;
    officeId: string;
    officeName?: string;
    reason?: string;
  }) => void;
  onDayAction?: () => void;
  dayActionLabel?: string;
  dayActionDisabled?: boolean;
}

type AgendaRow =
  | {
      id: string;
      time: string;
      title: string;
      subtitle: string;
      status: "Pendiente" | "Confirmado" | "Cancelado" | "Completado" | "Bloqueado";
      patientId?: string;
      officeId: string;
      officeName?: string;
      kind: "Agendado";
    }
  | {
      id: string;
      blockId: string;
      time: string;
      title: string;
      subtitle: string;
      officeId: string;
      officeName?: string;
      kind: "Bloqueado";
    }
  | {
      id: string;
      time: string;
      title: string;
      subtitle: string;
      officeId: string;
      officeName?: string;
      kind: "Libre";
    };

export function AgendaDayPanel({
  title = "Turnos del dia",
  dateLabel,
  items,
  mode = "default",
  onSelectFreeSlot,
  onCancelBookedSlot,
  onCompleteBookedSlot,
  onBlockFreeSlot,
  onUnblockBlockedSlot,
  onDayAction,
  dayActionLabel,
  dayActionDisabled = false,
}: AgendaDayPanelProps) {
  const booked = items.flatMap((item) => item.bookedSlots);
  const blocked = items.flatMap((item) => item.blockedSlots ?? []);
  const isFullDayBlocked = items.some((item) => item.fullDayBlocked);
  const fullDayBlockReason = items.find((item) => item.fullDayBlocked)?.fullDayBlockReason;
  const isWorkingDay = items.length > 0;
  const rows: AgendaRow[] = [
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
      status: item.status,
      patientId: item.patientId,
      officeId: item.officeId,
      officeName: item.officeName,
      kind: "Agendado" as const,
    })),
    ...blocked.map((item) => ({
      id: item.id,
      blockId: item.blockId,
      time: item.time,
      title: "Horario bloqueado",
      subtitle: item.reason ? `Motivo: ${item.reason}` : "No disponible para agendar",
      patientId: undefined,
      officeId: item.officeId,
      officeName: item.officeName,
      kind: "Bloqueado" as const,
    })),
    ...items.flatMap((item) =>
      item.freeSlots.map((slot) => ({
        id: `free-${item.officeId}-${slot}`,
        time: slot,
        title: mode === "special" ? "Libre" : "Horario libre",
        subtitle:
          mode === "special"
            ? "Disponible para bloquear"
            : mode === "patient" && item.officeName
              ? `Disponible en ${item.officeName}`
              : "Disponible",
        patientId: undefined,
        officeId: item.officeId,
        officeName: item.officeName,
        kind: "Libre" as const,
      })),
    ),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <aside className="calendar-side">
      <section className="panel panel-separated stack-md">
        <div className="calendar-panel-header">
          <h3 className="title-md">{title}</h3>
          {dateLabel ? <span className="meta">{dateLabel}</span> : null}
        </div>

        {isFullDayBlocked ? (
          <div className="stack-sm">
            <strong>Este dia no se atiende</strong>
            <span className="meta">
              El consultorio esta bloqueado para esta fecha y no se pueden agendar turnos.
            </span>
            {fullDayBlockReason ? (
              <span className="meta">Motivo: {fullDayBlockReason}</span>
            ) : null}
            {mode === "special" ? (
              <div className="form-actions">
                <Button
                  variant="ghost"
                  className="button-inline"
                  disabled={dayActionDisabled}
                  onClick={onDayAction}
                >
                  {dayActionLabel ?? "Desbloquear dia"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : !isWorkingDay ? (
          <div className="stack-sm">
            <strong>No se atiende este dia</strong>
            <span className="meta">Selecciona otro dia del calendario.</span>
          </div>
        ) : (
          <div className="slot-stack slot-stack-scroll">
            {mode === "special" ? (
              <div className="form-actions">
                <Button
                  variant="ghost"
                  className="button-inline"
                  disabled={dayActionDisabled}
                  onClick={onDayAction}
                >
                  {dayActionLabel ?? (booked.length ? "Cancelar dia" : "Bloquear dia")}
                </Button>
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
                    <div className="agenda-entry-actions-group">
                      {row.kind === "Agendado" ? (
                        <>
                          {row.status !== "Completado" && onCancelBookedSlot ? (
                            <Button
                              variant="ghost"
                              className="button-inline"
                              onClick={() => onCancelBookedSlot(row.id)}
                            >
                              Cancelar turno
                            </Button>
                          ) : null}
                          {row.status === "Confirmado" && onCompleteBookedSlot ? (
                            <Button
                              variant="ghost"
                              className="button-inline"
                              onClick={() => onCompleteBookedSlot(row.id)}
                            >
                              Completar
                            </Button>
                          ) : null}
                          {mode === "patient" ? null : row.patientId ? (
                            <Link to={`/professional/patients/${row.patientId}`}>
                              <Button variant="ghost" className="button-inline">
                                Ver
                              </Button>
                            </Link>
                          ) : null}
                        </>
                      ) : row.kind === "Bloqueado" ? (
                        mode === "special" ? (
                          <Button
                            variant="ghost"
                            className="button-inline"
                            disabled={!onUnblockBlockedSlot}
                            onClick={() =>
                              onUnblockBlockedSlot?.({
                                blockId: row.blockId,
                                time: row.time,
                                officeId: row.officeId,
                                officeName: row.officeName,
                                reason: row.subtitle.startsWith("Motivo: ")
                                  ? row.subtitle.replace("Motivo: ", "")
                                  : undefined,
                              })
                            }
                          >
                            Desbloquear
                          </Button>
                        ) : (
                          <span className="badge">Bloqueado</span>
                        )
                      ) : mode === "special" ? (
                        row.kind === "Libre" ? (
                          <Button
                            variant="ghost"
                            className="button-inline"
                            disabled={!onBlockFreeSlot}
                            onClick={() =>
                              onBlockFreeSlot?.({
                                time: row.time,
                                officeId: row.officeId,
                                officeName: row.officeName,
                              })
                            }
                          >
                            Bloquear
                          </Button>
                        ) : null
                      ) : row.kind === "Libre" && onSelectFreeSlot ? (
                        <Button
                          variant="ghost"
                          className="button-inline"
                          onClick={() =>
                            onSelectFreeSlot({
                              time: row.time,
                              officeId: row.officeId,
                              officeName: row.officeName,
                            })
                          }
                        >
                          Agendar
                        </Button>
                      ) : mode === "patient" ? null : null}
                    </div>
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
