import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getProfessionalPatientDetailMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { StudyDetailView } from "@/shared/components/StudyDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function ProfessionalPatientStudyDetailPage() {
  const navigate = useNavigate();
  const { patientId = "", studyId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.professionalPatientDetail(patientId),
    queryFn: () => getProfessionalPatientDetailMock(patientId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando estudio...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el estudio.</div>;

  const study = query.data.studies.find((item) => item.id === studyId);

  if (!study) return <div className="centered-feedback">No encontramos ese estudio.</div>;

  return (
    <SubpageShell onBack={() => navigate(`/professional/patients/${patientId}?tab=studies`)}>
      <StudyDetailView study={study} />
    </SubpageShell>
  );
}
