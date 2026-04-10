import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPatientHealthSections } from "@/modules/patient/api/patient.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { ListEntry } from "@/shared/components/ListEntry";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate } from "@/shared/utils/date";

export function PatientHealthPage() {
  const { user } = useAuth();
  const patientId = user?.patientId ?? "";
  const query = useQuery({
    queryKey: [...queryKeys.patientHealth, patientId],
    queryFn: () => getPatientHealthSections(patientId),
    enabled: Boolean(patientId),
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
