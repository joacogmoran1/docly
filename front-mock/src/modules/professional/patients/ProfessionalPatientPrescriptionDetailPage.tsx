import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getProfessionalPatientDetailMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";

export function ProfessionalPatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const { patientId = "", prescriptionId = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.professionalPatientDetail(patientId),
    queryFn: () => getProfessionalPatientDetailMock(patientId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  const prescription = query.data.prescriptions.find((item) => item.id === prescriptionId);

  if (!prescription) return <div className="centered-feedback">No encontramos esa receta.</div>;

  return (
    <SubpageShell onBack={() => navigate(`/professional/patients/${patientId}?tab=prescriptions`)}>
      <PrescriptionDetailView prescription={prescription} />
    </SubpageShell>
  );
}
