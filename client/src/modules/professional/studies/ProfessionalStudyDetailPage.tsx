import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { StudyEditorModal, type StudyEditorValues } from "@/modules/patient/dashboard/StudyEditorModal";
import { deleteStudy, getStudy, updateStudy } from "@/modules/studies/api/studies.api";
import { mapStudyToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { StudyDetailView } from "@/shared/components/StudyDetailView";
import { SubpageShell } from "@/shared/components/SubpageShell";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

function getPatientName() {
  return "Paciente";
}

export function ProfessionalStudyDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studyId = "" } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.professionalStudies, "detail", studyId],
    queryFn: () => getStudy(studyId),
    enabled: Boolean(studyId),
  });

  const updateMutation = useMutation({
    mutationFn: (values: StudyEditorValues) =>
      updateStudy(studyId, {
        type: values.type,
        date: values.date,
        results: values.reportContent,
        fileUrl: values.attachmentContent,
      }),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalStudies] }),
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalStudies, "detail", studyId] }),
      ];
      if (query.data) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(query.data.patientId),
          }),
        );
      }
      await Promise.all(invalidations);
      setFeedback({ tone: "success", message: "Estudio actualizado correctamente." });
      setIsEditing(false);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar el estudio.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStudy(studyId),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalStudies] }),
      ];
      if (query.data) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(query.data.patientId),
          }),
        );
      }
      await Promise.all(invalidations);
      navigate("/professional/studies", { replace: true });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el estudio.",
      });
      setIsDeleteOpen(false);
    },
  });

  if (query.isLoading) {
    return <div className="centered-feedback">Cargando estudio...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar el estudio.</div>;
  }

  const patientName = query.data.patient?.user
    ? [query.data.patient.user.name, query.data.patient.user.lastName].filter(Boolean).join(" ")
    : getPatientName();

  return (
    <>
      <SubpageShell
        onBack={() => navigate("/professional/studies")}
        headerAction={
          <div className="row-wrap">
            {query.data.patientId ? (
              <Button variant="ghost" onClick={() => navigate(`/professional/patients/${query.data.patientId}?tab=studies`)}>
                Ver ficha
              </Button>
            ) : null}
            <Button onClick={() => setIsEditing(true)}>Editar estudio</Button>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              Eliminar estudio
            </Button>
          </div>
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

        <Card title="Paciente" className="panel-separated">
          <div className="plain-list">
            <div className="list-row">
              <strong>{patientName}</strong>
              <span className="meta">{query.data.type}</span>
            </div>
          </div>
        </Card>

        <StudyDetailView study={mapStudyToItem(query.data)} />
      </SubpageShell>

      <StudyEditorModal
        isOpen={isEditing}
        study={query.data}
        isSubmitting={updateMutation.isPending}
        onClose={() => setIsEditing(false)}
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Eliminar estudio"
        description="Esta accion eliminara el estudio del modulo profesional."
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          if (deleteMutation.isPending) return;
          deleteMutation.mutate();
        }}
      />
    </>
  );
}
