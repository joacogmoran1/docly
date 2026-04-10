import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProfessionalAppointments } from "@/modules/appointments/api/appointments.api";
import { getProfessionalOfficesData } from "@/modules/professional/api/professional.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
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
  const professionalId = user?.professionalId ?? "";
  const [officeId, setOfficeId] = useState("all");
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

  if (dashboardQuery.isLoading || officesQuery.isLoading) {
    return <div className="centered-feedback">Cargando inicio...</div>;
  }
  if (dashboardQuery.isError || officesQuery.isError || !officesQuery.data) {
    return <div className="centered-feedback">No pudimos cargar el inicio.</div>;
  }

  return (
    <div className="page-stack">
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
    </div>
  );
}
