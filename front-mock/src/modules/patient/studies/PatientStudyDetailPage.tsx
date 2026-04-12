import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientStudiesMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { StudyDetailView } from "@/shared/components/StudyDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function PatientStudyDetailPage() {
  const navigate = useNavigate();
  const { studyId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.patientStudies,
    queryFn: getPatientStudiesMock,
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando estudio...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el estudio.</div>;

  const study = query.data.find((item) => item.id === studyId);

  if (!study) return <div className="centered-feedback">No encontramos ese estudio.</div>;

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <StudyDetailView study={study} />
    </SubpageShell>
  );
}
