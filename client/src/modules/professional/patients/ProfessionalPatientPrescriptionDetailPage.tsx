import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPrescription } from "@/modules/prescriptions/api/prescriptions.api";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function ProfessionalPatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const { patientId = "", prescriptionId = "" } = useParams();
  const query = useQuery({
    queryKey: [...queryKeys.professionalPatientDetail(patientId), "prescription", prescriptionId],
    queryFn: () => getPrescription(prescriptionId),
    enabled: Boolean(prescriptionId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  return (
    <SubpageShell onBack={() => navigate(`/professional/patients/${patientId}?tab=prescriptions`)}>
      <PrescriptionDetailView prescription={mapPrescriptionToItem(query.data)} />
    </SubpageShell>
  );
}
