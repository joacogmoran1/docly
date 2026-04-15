import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  cancelAppointment,
  completeAppointment,
  getProfessionalAppointments,
} from "@/modules/appointments/api/appointments.api";
import { getProfessionalOfficesData } from "@/modules/professional/api/professional.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ListEntry } from "@/shared/components/ListEntry";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ProfessionalDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [officeId, setOfficeId] = useState("all");
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [appointmentToComplete, setAppointmentToComplete] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const today = getToday();
  const dashboardQuery = useQuery({
    queryKey: [...queryKeys.professionalDashboard, professionalId, today],
    queryFn: () =>
      getProfessionalAppointments(professionalId, {
        date: today,
      }),
    enabled: Boolean(professionalId),
  });
  const officesQuery = useQuery({
    queryKey: [...queryKeys.professionalOffices, professionalId],
    queryFn: () => getProfessionalOfficesData(professionalId),
    enabled: Boolean(professionalId),
  });

  const rows = useMemo(() => {
    const appointments = dashboardQuery.data ?? [];
    return appointments.filter((appointment) =>
      officeId === "all" ? true : appointment.officeId === officeId,
    );
  }, [dashboardQuery.data, officeId]);
  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      cancelAppointment(appointmentId, "Cancelado desde inicio del profesional"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalDashboard, professionalId, today],
      });
      setFeedback({
        tone: "success",
        message: "Turno cancelado correctamente.",
      });
      setAppointmentToCancel(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cancelar el turno.",
      });
      setAppointmentToCancel(null);
    },
  });
  const completeMutation = useMutation({
    mutationFn: (appointmentId: string) => completeAppointment(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalDashboard, professionalId, today],
      });
      setFeedback({
        tone: "success",
        message: "Turno completado correctamente.",
      });
      setAppointmentToComplete(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo completar el turno.",
      });
      setAppointmentToComplete(null);
    },
  });

  if (dashboardQuery.isLoading || officesQuery.isLoading) {
    return <div className="centered-feedback">Cargando inicio...</div>;
  }
  if (dashboardQuery.isError || officesQuery.isError || !officesQuery.data) {
    return <div className="centered-feedback">No pudimos cargar el inicio.</div>;
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

      <div className="dashboard-plain-header">
        <h1 className="title-lg">Agenda del dia</h1>

        <div className="dashboard-filter-wrap">
          <Select
            options={[
              { value: "all", label: "Todos los consultorios" },
              ...officesQuery.data.map((office) => ({ value: office.id, label: office.name })),
            ]}
            value={officeId}
            onChange={(event) => setOfficeId(event.target.value)}
          />
        </div>
      </div>

      <div className="dashboard-plain-list">
        {rows.length ? (
          rows.map((item) => (
            <ListEntry
              key={item.id}
              title={[
                item.patient?.user?.name,
                item.patient?.user?.lastName,
              ]
                .filter(Boolean)
                .join(" ")}
              className="dashboard-appointment-entry"
              mainClassName="dashboard-appointment-main"
              actionClassName="dashboard-appointment-side"
              action={
                <>
                  <span className="slot-entry-time">
                    {formatNumericDate(`${item.date}T00:00:00`)} - {formatNumericTime(`${item.date}T${item.time}`)}
                  </span>
                  <div className="row-wrap appointment-actions">
                    {item.status === "confirmed" ? (
                      <Button
                        variant="ghost"
                        className="button-inline"
                        onClick={() => setAppointmentToComplete(item.id)}
                      >
                        Completar
                      </Button>
                    ) : null}
                    {item.status !== "completed" ? (
                      <Button
                        variant="ghost"
                        className="button-inline"
                        onClick={() => setAppointmentToCancel(item.id)}
                      >
                        Cancelar turno
                      </Button>
                    ) : null}
                  </div>
                  {item.patientId ? (
                    <Link to={`/professional/patients/${item.patientId}`}>
                      <Button variant="ghost" className="button-inline">
                        Ver paciente
                      </Button>
                    </Link>
                  ) : null}
                </>
              }
            >
              <span className="slot-entry-meta">{item.office?.name ?? "Consultorio"}</span>
              <span className="slot-entry-meta">{item.reason ?? "Consulta"}</span>
            </ListEntry>
          ))
        ) : (
          <span className="meta">No hay turnos para hoy con ese consultorio.</span>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(appointmentToCancel)}
        title="Cancelar turno"
        description="Se cancelara este turno."
        tone="danger"
        confirmLabel={cancelMutation.isPending ? "Cancelando..." : "Cancelar turno"}
        onClose={() => setAppointmentToCancel(null)}
        onConfirm={() => {
          if (!appointmentToCancel || cancelMutation.isPending) return;
          cancelMutation.mutate(appointmentToCancel);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(appointmentToComplete)}
        title="Completar turno"
        description="Se marcara este turno como completado."
        confirmLabel={completeMutation.isPending ? "Completando..." : "Completar turno"}
        onClose={() => setAppointmentToComplete(null)}
        onConfirm={() => {
          if (!appointmentToComplete || completeMutation.isPending) return;
          completeMutation.mutate(appointmentToComplete);
        }}
      />
    </div>
  );
}
