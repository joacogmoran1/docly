import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAppointment,
  confirmAppointment,
  getPatientAppointments,
} from "@/modules/appointments/api/appointments.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { mapApiAppointmentStatus, toDateTimeIso } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

function getProfessionalName(appointment: Awaited<ReturnType<typeof getPatientAppointments>>[number]) {
  return appointment.professional?.user
    ? [appointment.professional.user.name, appointment.professional.user.lastName]
        .filter(Boolean)
        .join(" ")
    : "Profesional";
}

export function PatientAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [professionalId, setProfessionalId] = useState("all");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const query = useQuery({
    queryKey: [...queryKeys.patientAppointments, patientId],
    queryFn: () => getPatientAppointments(patientId),
    enabled: Boolean(patientId),
  });

  const professionalOptions = useMemo(() => {
    const registry = new Map<string, string>();
    (query.data ?? []).forEach((appointment) => {
      registry.set(appointment.professionalId, getProfessionalName(appointment));
    });
    return [
      { value: "all", label: "Todos los profesionales" },
      ...Array.from(registry.entries())
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [query.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? [])
      .filter((appointment) => {
        const appointmentStatus = mapApiAppointmentStatus(appointment.status);
        const matchesStatus = status === "all" || appointment.status === status;
        const matchesProfessional =
          professionalId === "all" || appointment.professionalId === professionalId;
        const professionalName = getProfessionalName(appointment).toLowerCase();

        return (
          matchesStatus &&
          matchesProfessional &&
          (!term ||
            professionalName.includes(term) ||
            (appointment.reason ?? "").toLowerCase().includes(term) ||
            (appointment.office?.name ?? "").toLowerCase().includes(term) ||
            appointmentStatus.toLowerCase().includes(term))
        );
      })
      .sort((left, right) =>
        toDateTimeIso(right.date, right.time).localeCompare(toDateTimeIso(left.date, left.time)),
      );
  }, [professionalId, query.data, search, status]);

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patientAppointments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.patientDashboard }),
      ]);
      setFeedback({ tone: "success", message: "Turno cancelado correctamente." });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cancelar el turno.",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (appointmentId: string) => confirmAppointment(appointmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.patientAppointments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.patientDashboard }),
      ]);
      setFeedback({ tone: "success", message: "Turno confirmado correctamente." });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo confirmar el turno.",
      });
    },
  });

  if (query.isLoading) {
    return <div className="centered-feedback">Cargando turnos...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar los turnos.</div>;
  }

  return (
    <div className="page-stack">
      {feedback ? (
        <div className={`feedback-banner${feedback.tone === "error" ? " is-error" : " is-success"}`}>
          <span>{feedback.message}</span>
          <Button variant="ghost" className="button-inline" onClick={() => setFeedback(null)}>
            Cerrar
          </Button>
        </div>
      ) : null}

      <Card
        title="Turnos"
        description="Historial completo de tus turnos, con filtros por profesional y estado."
        className="panel-separated"
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por profesional, consultorio o motivo"
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Profesional"
            options={professionalOptions}
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          />
          <Select
            label="Estado"
            options={[
              { value: "all", label: "Todos" },
              { value: "pending", label: "Pendientes" },
              { value: "confirmed", label: "Confirmados" },
              { value: "completed", label: "Completados" },
              { value: "cancelled", label: "Cancelados" },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Resultados" className="panel-separated">
        <div className="plain-list">
          {rows.length ? (
            rows.map((appointment) => {
              const dateTime = toDateTimeIso(appointment.date, appointment.time);
              const appointmentStatus = mapApiAppointmentStatus(appointment.status);
              const canConfirm = appointment.status === "pending";
              const canCancel =
                appointment.status !== "cancelled" && appointment.status !== "completed";

              return (
                <div key={appointment.id} className="list-row">
                  <div className="stack-sm">
                    <strong>
                      {getProfessionalName(appointment)} - {formatNumericDate(dateTime)} a las{" "}
                      {formatNumericTime(dateTime)}
                    </strong>
                    <span className="meta">{appointment.office?.name ?? "Consultorio"}</span>
                    <span className="meta">{appointment.reason ?? "Consulta"}</span>
                    <span className="meta">Estado: {appointmentStatus}</span>
                    {appointment.cancellationReason ? (
                      <span className="meta">
                        Motivo de cancelacion: {appointment.cancellationReason}
                      </span>
                    ) : null}
                  </div>
                  <div className="row-wrap">
                    {canConfirm ? (
                      <Button
                        variant="ghost"
                        disabled={confirmMutation.isPending || cancelMutation.isPending}
                        onClick={() => confirmMutation.mutate(appointment.id)}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      disabled={!canCancel || confirmMutation.isPending || cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(appointment.id)}
                    >
                      {appointment.status === "completed"
                        ? "Completado"
                        : appointment.status === "cancelled"
                          ? "Cancelado"
                          : "Cancelar"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <span className="meta">No hay turnos para los filtros actuales.</span>
          )}
        </div>
      </Card>
    </div>
  );
}
