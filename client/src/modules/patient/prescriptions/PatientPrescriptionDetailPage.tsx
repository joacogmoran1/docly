import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  downloadPrescriptionPdf,
  getPrescription,
} from "@/modules/prescriptions/api/prescriptions.api";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Button } from "@/shared/ui/Button";

function triggerFileDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function PatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const { prescriptionId = "" } = useParams();
  const query = useQuery({
    queryKey: [...queryKeys.patientPrescriptions, prescriptionId],
    queryFn: () => getPrescription(prescriptionId),
    enabled: Boolean(prescriptionId),
  });
  const downloadMutation = useMutation({
    mutationFn: () => downloadPrescriptionPdf(prescriptionId),
    onSuccess: ({ blob, filename }) => {
      triggerFileDownload(blob, filename);
    },
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  return (
    <SubpageShell
      onBack={() => navigate(-1)}
      headerAction={
        <Button
          type="button"
          onClick={() => downloadMutation.mutate()}
          disabled={downloadMutation.isPending}
        >
          {downloadMutation.isPending ? "Descargando PDF..." : "Descargar PDF"}
        </Button>
      }
    >
      <PrescriptionDetailView prescription={mapPrescriptionToItem(query.data)} />
      {downloadMutation.isError ? (
        <span className="field-error">
          {downloadMutation.error instanceof Error
            ? downloadMutation.error.message
            : "No se pudo descargar la receta en PDF."}
        </span>
      ) : null}
    </SubpageShell>
  );
}
