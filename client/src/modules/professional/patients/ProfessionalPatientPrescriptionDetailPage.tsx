import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  deletePrescription,
  downloadPrescriptionPdf,
  getPrescription,
} from "@/modules/prescriptions/api/prescriptions.api";
import { PrescriptionComposer } from "@/modules/professional/prescriptions/PrescriptionComposer";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

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

export function ProfessionalPatientPrescriptionDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patientId = "", prescriptionId = "" } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const query = useQuery({
    queryKey: [...queryKeys.professionalPatientDetail(patientId), "prescription", prescriptionId],
    queryFn: () => getPrescription(prescriptionId),
    enabled: Boolean(prescriptionId),
  });
  const downloadMutation = useMutation({
    mutationFn: () => downloadPrescriptionPdf(prescriptionId),
    onSuccess: ({ blob, filename }) => {
      triggerFileDownload(blob, filename);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deletePrescription(prescriptionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPatientDetail(patientId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPrescriptions,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientPrescriptions,
        }),
      ]);
      navigate(`/professional/patients/${patientId}?tab=prescriptions`);
    },
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando receta...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la receta.</div>;

  const patientName = query.data.patient?.user
    ? [query.data.patient.user.name, query.data.patient.user.lastName].filter(Boolean).join(" ")
    : "Paciente";

  return (
    <>
      <SubpageShell
        onBack={() => navigate(`/professional/patients/${patientId}?tab=prescriptions`)}
        headerAction={
          isEditing ? null : (
            <div className="row-wrap">
              <Button
                type="button"
                variant="ghost"
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
              >
                {downloadMutation.isPending ? "Descargando PDF..." : "Descargar PDF"}
              </Button>
              <Button variant="ghost" onClick={() => navigate(`/professional/prescriptions/${prescriptionId}`)}>
                Abrir en modulo
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Editar receta
              </Button>
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                Eliminar receta
              </Button>
            </div>
          )
        }
      >
        {isEditing ? (
          <Card title="Editar receta" description="Actualiza la informacion de la receta emitida." className="panel-separated">
            <PrescriptionComposer
              patientId={patientId}
              patientName={patientName}
              prescriptionId={prescriptionId}
              initialValues={{
                diagnosis: query.data.diagnosis ?? "",
                instructions: query.data.instructions ?? "",
                validUntil: query.data.validUntil ?? "",
                medications: query.data.medications,
              }}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          </Card>
        ) : (
          <PrescriptionDetailView prescription={mapPrescriptionToItem(query.data)} />
        )}
      </SubpageShell>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Eliminar receta"
        description="Esta accion eliminara la receta del historial del paciente."
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (deleteMutation.isPending) return;
          deleteMutation.mutate();
        }}
      />
      {deleteMutation.isError ? (
        <span className="field-error">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "No se pudo eliminar la receta."}
        </span>
      ) : null}
      {downloadMutation.isError ? (
        <span className="field-error">
          {downloadMutation.error instanceof Error
            ? downloadMutation.error.message
            : "No se pudo descargar la receta en PDF."}
        </span>
      ) : null}
    </>
  );
}
