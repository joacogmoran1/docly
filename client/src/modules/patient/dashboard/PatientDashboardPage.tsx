import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPatientDashboard } from "@/modules/patient/api/patient.api";
import { cancelAppointment } from "@/modules/appointments/api/appointments.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

export function PatientDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("appointments");
  const patientId = user?.patientId ?? "";
  const query = useQuery({
    queryKey: [...queryKeys.patientDashboard, patientId],
    queryFn: () => getPatientDashboard(patientId),
    enabled: Boolean(patientId),
  });
  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientDashboard, patientId],
      });
    },
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando inicio...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el inicio.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Inicio</h1>
        <div className="tabs-list">
          <button
            type="button"
            className={`tabs-trigger${section === "appointments" ? " active" : ""}`}
            onClick={() => setSection("appointments")}
          >
            Turnos
          </button>
          <button
            type="button"
            className={`tabs-trigger${section === "prescriptions" ? " active" : ""}`}
            onClick={() => setSection("prescriptions")}
          >
            Recetas
          </button>
          <button
            type="button"
            className={`tabs-trigger${section === "studies" ? " active" : ""}`}
            onClick={() => setSection("studies")}
          >
            Estudios
          </button>
        </div>
      </div>

      {section === "appointments" ? (
        <section className="page-stack">
          <h2 className="title-md">Proximos turnos</h2>

          <div className="dashboard-plain-list">
            {query.data.appointments.length ? (
              query.data.appointments.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.professionalName}
                  className="dashboard-appointment-entry"
                  mainClassName="dashboard-appointment-main"
                  actionClassName="dashboard-appointment-side patient-appointment-side"
                  action={
                    <>
                      <span className="slot-entry-time patient-appointment-date">
                        {formatNumericDate(item.date)} - {formatNumericTime(item.date)}
                      </span>
                      <div className="row-wrap appointment-actions">
                        <Button
                          variant="ghost"
                          className="button-inline"
                          disabled={
                            item.status === "Cancelado" ||
                            cancelMutation.isPending
                          }
                          onClick={() => cancelMutation.mutate(item.id)}
                        >
                          {item.status === "Cancelado" ? "Cancelado" : "Cancelar"}
                        </Button>
                      </div>
                    </>
                  }
                >
                  <span className="slot-entry-meta">{item.specialty}</span>
                  <span className="slot-entry-meta">{item.office}</span>
                </ListEntry>
              ))
            ) : (
              <span className="meta">Todavia no hay turnos registrados.</span>
            )}
          </div>
        </section>
      ) : null}

      {section === "prescriptions" ? (
        <section className="page-stack">
          <h2 className="title-md">Recetas</h2>
          <div className="dashboard-plain-list">
            {query.data.prescriptions.length ? (
              query.data.prescriptions.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.medication}
                  action={
                    <Link to={`/patient/prescriptions/${item.id}`}>
                      <Button variant="ghost">Ver receta</Button>
                    </Link>
                  }
                >
                  <span className="slot-entry-meta">{item.professionalName}</span>
                  <span className="slot-entry-meta">{item.dose || "Sin detalle de dosis"}</span>
                </ListEntry>
              ))
            ) : (
              <span className="meta">Todavia no hay recetas registradas.</span>
            )}
          </div>
        </section>
      ) : null}

      {section === "studies" ? (
        <section className="page-stack">
          <h2 className="title-md">Estudios</h2>
          <div className="dashboard-plain-list">
            {query.data.studies.length ? (
              query.data.studies.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.title}
                  action={
                    <Link to={`/patient/studies/${item.id}`}>
                      <Button variant="ghost">Abrir estudio</Button>
                    </Link>
                  }
                >
                  <span className="slot-entry-meta">{item.requestedBy}</span>
                  <span className="slot-entry-meta">{item.reportSummary}</span>
                </ListEntry>
              ))
            ) : (
              <span className="meta">Todavia no hay estudios registrados.</span>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
