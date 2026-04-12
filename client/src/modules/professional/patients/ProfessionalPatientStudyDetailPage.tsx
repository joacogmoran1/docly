import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getStudy } from "@/modules/studies/api/studies.api";
import { mapStudyToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { StudyDetailView } from "@/shared/components/StudyDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function ProfessionalPatientStudyDetailPage() {
  const navigate = useNavigate();
  const { patientId = "", studyId = "" } = useParams();
  const query = useQuery({
    queryKey: [...queryKeys.professionalPatientDetail(patientId), "study", studyId],
    queryFn: () => getStudy(studyId),
    enabled: Boolean(studyId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando estudio...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el estudio.</div>;

  return (
    <SubpageShell onBack={() => navigate(`/professional/patients/${patientId}?tab=studies`)}>
      <StudyDetailView study={mapStudyToItem(query.data)} />
    </SubpageShell>
  );
}
