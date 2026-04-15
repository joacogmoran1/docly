import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getMedicalRecord } from "@/modules/medical-records/api/medical-records.api";
import { mapMedicalRecordToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { RecordDetailView } from "@/shared/components/RecordDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function PatientProfessionalRecordDetailPage() {
  const navigate = useNavigate();
  const { professionalId = "", recordId = "" } = useParams();
  const query = useQuery({
    queryKey: [...queryKeys.patientProfessionalDetail(professionalId), "record", recordId],
    queryFn: () => getMedicalRecord(recordId),
    enabled: Boolean(recordId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando registro...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el registro.</div>;

  const record = mapMedicalRecordToItem(query.data);

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <RecordDetailView
        title={record.title}
        timestamp={record.timestamp}
        body={record.body}
        reason={record.reason}
        diagnosis={record.diagnosis}
        treatment={record.treatment}
        notes={record.notes}
        vitalSigns={record.vitalSigns}
      />
    </SubpageShell>
  );
}
