import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProfessionalOfficesMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";

export function ProfessionalOfficesPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: queryKeys.professionalOffices,
    queryFn: getProfessionalOfficesMock,
  });

  const rows = useMemo(() => {
    const items = query.data ?? [];
    return items.filter(
      (office) =>
        office.name.toLowerCase().includes(search.toLowerCase()) ||
        office.address.toLowerCase().includes(search.toLowerCase()),
    );
  }, [query.data, search]);

  if (query.isLoading) return <div className="centered-feedback">Cargando consultorios...</div>;
  if (query.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar consultorios.</div>;
  }

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Consultorios</h1>
        <SearchBar placeholder="Buscar consultorio" value={search} onChange={setSearch} />
      </div>

      <div className="dashboard-plain-list">
        {rows.map((office) => (
          <ListEntry
            key={office.id}
            title={office.name}
            className="office-entry"
            action={
              <Link to={`/professional/offices/${office.id}`}>
                <Button>Ver consultorio</Button>
              </Link>
            }
          >
              <span className="slot-entry-meta">{office.address}</span>
          </ListEntry>
        ))}

        {!rows.length ? <span className="meta">No encontramos consultorios para esa busqueda.</span> : null}
      </div>
    </div>
  );
}
