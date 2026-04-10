import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProfessionalPatientsMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";

export function ProfessionalPatientsPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: queryKeys.professionalPatients,
    queryFn: getProfessionalPatientsMock,
  });

  const rows = useMemo(() => {
    const items = query.data ?? [];
    return items.filter(
      (patient) =>
        patient.fullName.toLowerCase().includes(search.toLowerCase()) ||
        patient.document.includes(search),
    );
  }, [query.data, search]);

  if (query.isLoading) return <div className="centered-feedback">Cargando pacientes...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar pacientes.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Pacientes</h1>

        <SearchBar placeholder="Buscar por nombre o documento" value={search} onChange={setSearch} />
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
                <span className="slot-entry-meta">{row.document}</span>
              </div>
          </ListEntry>
        ))}

        {!rows.length ? <span className="meta">No encontramos pacientes para esa busqueda.</span> : null}
      </div>
    </div>
  );
}
