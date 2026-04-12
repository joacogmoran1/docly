import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalPatients } from "@/modules/professional/api/professional.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate } from "@/shared/utils/date";

export function ProfessionalPatientsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const professionalId = user?.professionalId ?? "";
  const query = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId],
    queryFn: () => getProfessionalPatients(professionalId),
    enabled: Boolean(professionalId),
  });

  const rows = useMemo(() => {
    const items = query.data ?? [];
    return items.filter(
      (patient) =>
        patient.fullName.toLowerCase().includes(search.toLowerCase()) ||
        patient.document.toLowerCase().includes(search.toLowerCase()) ||
        (patient.email ?? "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [query.data, search]);

  if (query.isLoading) return <div className="centered-feedback">Cargando pacientes...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar pacientes.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Pacientes</h1>

        <SearchBar placeholder="Buscar por nombre o contacto" value={search} onChange={setSearch} />
      </div>

      <div className="dashboard-plain-list">
        {rows.map((row) => (
          <ListEntry
            key={row.id}
            title={row.fullName}
            className="patient-entry"
            titleClassName="patient-entry-name"
            action={
              <Link to={`/professional/patients/${row.id}`}>
                <Button>Ver ficha</Button>
              </Link>
            }
          >
              <div className="patient-entry-meta-line">
                <span className="slot-entry-meta">{row.coverage}</span>
                <span className="patient-entry-separator">-</span>
                <span className="slot-entry-meta">{row.email ?? row.document}</span>
              </div>
              <div className="patient-entry-meta-line">
                <span className="slot-entry-meta">Turnos: {row.appointmentsCount ?? 0}</span>
                <span className="patient-entry-separator">-</span>
                <span className="slot-entry-meta">Registros: {row.reportsCount}</span>
                <span className="patient-entry-separator">-</span>
                <span className="slot-entry-meta">Recetas: {row.prescriptionsCount ?? 0}</span>
              </div>
              {row.lastVisit ? (
                <div className="patient-entry-meta-line">
                  <span className="slot-entry-meta">
                    Ultimo turno: {formatNumericDate(`${row.lastVisit}T00:00:00`)}
                  </span>
                  {row.lastAppointmentStatus ? (
                    <>
                      <span className="patient-entry-separator">-</span>
                      <span className="slot-entry-meta">{row.lastAppointmentStatus}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
          </ListEntry>
        ))}

        {!rows.length ? <span className="meta">No encontramos pacientes para esa busqueda.</span> : null}
      </div>
    </div>
  );
}
