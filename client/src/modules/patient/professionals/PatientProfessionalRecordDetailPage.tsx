import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientProfessionalDetailMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { RecordDetailView } from "@/shared/components/RecordDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function PatientProfessionalRecordDetailPage() {
  const navigate = useNavigate();
  const { professionalId = "", recordId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.patientProfessionalDetail(professionalId),
    queryFn: () => getPatientProfessionalDetailMock(professionalId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando registro...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el registro.</div>;

  const record = query.data.records.find((item) => item.id === recordId);

  if (!record) return <div className="centered-feedback">No encontramos ese registro.</div>;

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <RecordDetailView title={record.title} timestamp={record.timestamp} body={record.description} />
    </SubpageShell>
  );
}
