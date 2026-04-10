import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientPrescriptionsMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function PatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const { prescriptionId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.patientPrescriptions,
    queryFn: getPatientPrescriptionsMock,
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  const prescription = query.data.find((item) => item.id === prescriptionId);

  if (!prescription) return <div className="centered-feedback">No encontramos esa receta.</div>;

  return (
    <SubpageShell onBack={() => navigate(-1)}>
      <PrescriptionDetailView prescription={prescription} />
    </SubpageShell>
  );
}
