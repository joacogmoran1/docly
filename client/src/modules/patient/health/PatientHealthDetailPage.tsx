import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientHealthMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

export function PatientHealthDetailPage() {
  const navigate = useNavigate();
  const { sectionId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.patientHealth,
    queryFn: getPatientHealthMock,
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
        action={<Button>Editar</Button>}
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
