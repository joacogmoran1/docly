import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPatientHealthMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate } from "@/shared/utils/date";

export function PatientHealthPage() {
  const query = useQuery({
    queryKey: queryKeys.patientHealth,
    queryFn: getPatientHealthMock,
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando salud...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar tus datos.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Salud</h1>
      </div>

      <div className="dashboard-plain-list">
        {query.data.map((section) => (
          <ListEntry
            key={section.id}
            title={section.title}
            action={
              <Link to={`/patient/health/${section.id}`}>
                <Button variant="ghost" className="button-inline">
                  Ver
                </Button>
              </Link>
            }
          >
            <span className="slot-entry-meta">{section.privacy}</span>
            <span className="slot-entry-meta">Actualizado {formatNumericDate(section.updatedAt)}</span>
          </ListEntry>
        ))}
      </div>
    </div>
  );
}
