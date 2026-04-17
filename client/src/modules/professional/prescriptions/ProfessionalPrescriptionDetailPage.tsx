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

export function ProfessionalPrescriptionDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { prescriptionId = "" } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.professionalPrescriptions, "detail", prescriptionId],
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
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalPrescriptions] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.patientPrescriptions }),
      ];
      if (query.data) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(query.data.patientId),
          }),
        );
      }
      await Promise.all(invalidations);
      navigate("/professional/prescriptions", { replace: true });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la receta.",
      });
      setIsDeleteOpen(false);
    },
  });

  if (query.isLoading) {
    return <div className="centered-feedback">Cargando receta...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar la receta.</div>;
  }

  const patientName = query.data.patient?.user
    ? [query.data.patient.user.name, query.data.patient.user.lastName].filter(Boolean).join(" ")
    : "Paciente";

  return (
    <>
      <SubpageShell
        onBack={() => navigate("/professional/prescriptions")}
        headerAction={
          isEditing ? null : (
            <div className="row-wrap">
              {query.data.patientId ? (
                <Button variant="ghost" onClick={() => navigate(`/professional/patients/${query.data.patientId}?tab=prescriptions`)}>
                  Ver ficha
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
              >
                {downloadMutation.isPending ? "Descargando PDF..." : "Descargar PDF"}
              </Button>
              <Button onClick={() => setIsEditing(true)}>Editar receta</Button>
              <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                Eliminar receta
              </Button>
            </div>
          )
        }
      >
        {feedback ? (
          <div className={`feedback-banner${feedback.tone === "error" ? " is-error" : " is-success"}`}>
            <span>{feedback.message}</span>
            <Button variant="ghost" className="button-inline" onClick={() => setFeedback(null)}>
              Cerrar
            </Button>
          </div>
        ) : null}

        {isEditing ? (
          <Card title="Editar receta" description="Actualiza la informacion de la receta emitida." className="panel-separated">
            <PrescriptionComposer
              patientId={query.data.patientId}
              patientName={patientName}
              prescriptionId={prescriptionId}
              initialValues={{
                diagnosis: query.data.diagnosis ?? "",
                instructions: query.data.instructions ?? "",
                validUntil: query.data.validUntil ?? "",
                medications: query.data.medications,
              }}
              onCancel={() => setIsEditing(false)}
              onSuccess={async () => {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalPrescriptions] }),
                  queryClient.invalidateQueries({ queryKey: queryKeys.patientPrescriptions }),
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.professionalPatientDetail(query.data.patientId),
                  }),
                ]);
                setFeedback({ tone: "success", message: "Receta actualizada correctamente." });
                setIsEditing(false);
              }}
            />
          </Card>
        ) : (
          <PrescriptionDetailView prescription={mapPrescriptionToItem(query.data)} />
        )}
      </SubpageShell>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Eliminar receta"
        description="Esta accion eliminara la receta del modulo profesional."
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (deleteMutation.isPending) return;
          deleteMutation.mutate();
        }}
      />

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
