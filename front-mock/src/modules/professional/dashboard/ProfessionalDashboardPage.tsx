import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProfessionalDashboardMock, getProfessionalOfficesMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

export function ProfessionalDashboardPage() {
  const [officeId, setOfficeId] = useState("all");
  const dashboardQuery = useQuery({
    queryKey: [...queryKeys.professionalDashboard, officeId],
    queryFn: () => getProfessionalDashboardMock(officeId),
  });
  const officesQuery = useQuery({
    queryKey: queryKeys.professionalOffices,
    queryFn: getProfessionalOfficesMock,
  });

  if (dashboardQuery.isLoading || officesQuery.isLoading) {
    return <div className="centered-feedback">Cargando inicio...</div>;
  }
  if (dashboardQuery.isError || officesQuery.isError || !dashboardQuery.data || !officesQuery.data) {
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
        {dashboardQuery.data.todayAgenda.length ? (
          dashboardQuery.data.todayAgenda.map((item) => (
            <ListEntry
              key={item.id}
              title={item.patientName}
              className="dashboard-appointment-entry"
              mainClassName="dashboard-appointment-main"
              actionClassName="dashboard-appointment-side"
              action={
                <>
                  <span className="slot-entry-time">
                    {formatNumericDate(item.date)} - {formatNumericTime(item.date)}
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
                <span className="slot-entry-meta">{item.officeName}</span>
                <span className="slot-entry-meta">{item.reason}</span>
            </ListEntry>
          ))
        ) : (
          <span className="meta">No hay turnos para hoy con ese consultorio.</span>
        )}
      </div>
    </div>
  );
}
