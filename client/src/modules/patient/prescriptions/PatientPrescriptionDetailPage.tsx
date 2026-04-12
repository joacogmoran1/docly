import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPrescription } from "@/modules/prescriptions/api/prescriptions.api";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function PatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const { prescriptionId = "" } = useParams();
  const query = useQuery({
    queryKey: [...queryKeys.patientPrescriptions, prescriptionId],
    queryFn: () => getPrescription(prescriptionId),
    enabled: Boolean(prescriptionId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <PrescriptionDetailView prescription={mapPrescriptionToItem(query.data)} />
    </SubpageShell>
  );
}
