import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientHealthSections } from "@/modules/patient/api/patient.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

export function PatientHealthDetailPage() {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const { user } = useAuth();
  const patientId = user?.patientId ?? "";
  const query = useQuery({
    queryKey: [...queryKeys.patientHealth, patientId],
    queryFn: () => getPatientHealthSections(patientId),
    enabled: Boolean(patientId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando salud...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar tus datos.</div>;

  const section = query.data.find((item) => item.id === sectionId);

  if (!section) return <div className="centered-feedback">No encontramos esa seccion.</div>;

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <Card
        title={section.title}
        description={section.privacy}
        className="panel-separated"
      >
        <div className="plain-list">
          {section.items.map((item) => (
            <div key={item} className="list-row">
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>

      <span className="meta">Actualizado {formatNumericDate(section.updatedAt)}</span>
    </SubpageShell>
  );
}
