import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPatientDashboard } from "@/modules/patient/api/patient.api";
import {
  cancelAppointment,
  confirmAppointment,
} from "@/modules/appointments/api/appointments.api";
import {
  createStudy,
  deleteStudy,
  getPatientStudies,
  updateStudy,
} from "@/modules/studies/api/studies.api";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  StudyEditorModal,
  type StudyEditorValues,
} from "@/modules/patient/dashboard/StudyEditorModal";
import { getStudyTypeDefinition } from "@/shared/constants/medical-options";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ListEntry } from "@/shared/components/ListEntry";
import { Button } from "@/shared/ui/Button";
import type { ApiStudy } from "@/shared/types/api";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

export function PatientDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("appointments");
  const [appointmentView, setAppointmentView] = useState<"upcoming" | "cancelled">("upcoming");
  const [appointmentFeedback, setAppointmentFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [editingStudy, setEditingStudy] = useState<ApiStudy | null>(null);
  const [isCreatingStudy, setIsCreatingStudy] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<ApiStudy | null>(null);
  const patientId = user?.patientId ?? "";
  const query = useQuery({
    queryKey: [...queryKeys.patientDashboard, patientId],
    queryFn: () => getPatientDashboard(patientId),
    enabled: Boolean(patientId),
  });
  const studiesQuery = useQuery({
    queryKey: [...queryKeys.patientStudies, patientId, "dashboard"],
    queryFn: () => getPatientStudies(patientId),
    enabled: Boolean(patientId),
  });
  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientDashboard, patientId],
      });
      setAppointmentFeedback({
        tone: "success",
        message: "Turno cancelado correctamente.",
      });
    },
    onError: (error) => {
      setAppointmentFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cancelar el turno.",
      });
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (appointmentId: string) => confirmAppointment(appointmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientDashboard, patientId],
      });
      setAppointmentFeedback({
        tone: "success",
        message: "Turno confirmado correctamente.",
      });
    },
    onError: (error) => {
      setAppointmentFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo confirmar el turno.",
      });
    },
  });
  const createStudyMutation = useMutation({
    mutationFn: (values: StudyEditorValues) =>
      createStudy({
        patientId,
        professionalId: null,
        type: values.type,
        date: values.date,
        results: values.reportContent || undefined,
        fileUrl: values.attachmentContent || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientDashboard, patientId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientStudies, patientId],
        }),
      ]);
      setIsCreatingStudy(false);
    },
  });
  const updateStudyMutation = useMutation({
    mutationFn: (values: StudyEditorValues & {
      id: string;
    }) =>
      updateStudy(values.id, {
        type: values.type,
        date: values.date,
        results: values.reportContent || undefined,
        fileUrl: values.attachmentContent || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientDashboard, patientId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientStudies, patientId],
        }),
      ]);
      setEditingStudy(null);
    },
  });
  const deleteStudyMutation = useMutation({
    mutationFn: (studyId: string) => deleteStudy(studyId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientDashboard, patientId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientStudies, patientId],
        }),
      ]);
      setStudyToDelete(null);
    },
  });

  const studyRows = useMemo(
    () => {
      return (studiesQuery.data ?? []).map((study) => {
        const studyDefinition = getStudyTypeDefinition(study.type);
        const attachments = (study.fileUrl ?? "").startsWith("data:")
          ? study.fileUrl
            ? [study.fileUrl]
            : []
          : (study.fileUrl ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

        return {
        ...study,
        title: study.type,
        requestedBy: study.professional?.user
          ? [study.professional.user.name, study.professional.user.lastName].filter(Boolean).join(" ")
          : "Paciente",
          summary:
            studyDefinition.attachmentKind === "image"
              ? `${study.results ? "Informe PDF" : "Sin informe"} · ${attachments.length} imagen${attachments.length === 1 ? "" : "es"}`
              : `${study.results ? "Informe PDF" : "Sin informe"} · ${attachments.length ? "Resultados PDF cargados" : "Sin resultados"}`,
        };
      });
    },
    [studiesQuery.data],
  );
  const appointmentRows = useMemo(() => {
    const now = new Date();
    const appointments = query.data?.appointments ?? [];

    return appointments.filter((item) => {
      if (appointmentView === "cancelled") {
        return item.status === "Cancelado";
      }

      return (
        item.status !== "Cancelado" &&
        item.status !== "Completado" &&
        new Date(item.date) >= now
      );
    });
  }, [appointmentView, query.data?.appointments]);

  if (query.isLoading) return <div className="centered-feedback">Cargando inicio...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el inicio.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Inicio</h1>
        <div className="tabs-list">
          <button
            type="button"
            className={`tabs-trigger${section === "appointments" ? " active" : ""}`}
            onClick={() => setSection("appointments")}
          >
            Turnos
          </button>
          <button
            type="button"
            className={`tabs-trigger${section === "prescriptions" ? " active" : ""}`}
            onClick={() => setSection("prescriptions")}
          >
            Recetas
          </button>
          <button
            type="button"
            className={`tabs-trigger${section === "studies" ? " active" : ""}`}
            onClick={() => setSection("studies")}
          >
            Estudios
          </button>
        </div>
      </div>

      {appointmentFeedback ? (
        <div className={`feedback-banner${appointmentFeedback.tone === "error" ? " is-error" : " is-success"}`}>
          <span>{appointmentFeedback.message}</span>
          <Button
            variant="ghost"
            className="button-inline"
            onClick={() => setAppointmentFeedback(null)}
          >
            Cerrar
          </Button>
        </div>
      ) : null}

      {section === "appointments" ? (
        <section className="page-stack">
          <div className="row-between">
            <h2 className="title-md">Turnos</h2>
            <div className="tabs-list">
              <button
                type="button"
                className={`tabs-trigger${appointmentView === "upcoming" ? " active" : ""}`}
                onClick={() => setAppointmentView("upcoming")}
              >
                Proximos
              </button>
              <button
                type="button"
                className={`tabs-trigger${appointmentView === "cancelled" ? " active" : ""}`}
                onClick={() => setAppointmentView("cancelled")}
              >
                Cancelados
              </button>
            </div>
          </div>

          <div className="dashboard-plain-list">
            {appointmentRows.length ? (
              appointmentRows.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.professionalName}
                  className="dashboard-appointment-entry"
                  mainClassName="dashboard-appointment-main"
                  actionClassName="dashboard-appointment-side patient-appointment-side"
                  action={
                    <>
                      <span className="slot-entry-time patient-appointment-date">
                        {formatNumericDate(item.date)} - {formatNumericTime(item.date)}
                      </span>
                      <div className="row-wrap appointment-actions">
                        {item.status === "Pendiente" ? (
                          <Button
                            variant="ghost"
                            className="button-inline"
                            disabled={confirmMutation.isPending || cancelMutation.isPending}
                            onClick={() => confirmMutation.mutate(item.id)}
                          >
                            Confirmar
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="button-inline"
                          disabled={
                            item.status === "Cancelado" ||
                            item.status === "Completado" ||
                            confirmMutation.isPending ||
                            cancelMutation.isPending
                          }
                          onClick={() => cancelMutation.mutate(item.id)}
                        >
                          {item.status === "Cancelado"
                            ? "Cancelado"
                            : item.status === "Completado"
                              ? "Completado"
                              : "Cancelar"}
                        </Button>
                      </div>
                    </>
                  }
                >
                  <span className="slot-entry-meta">{item.specialty}</span>
                  <span className="slot-entry-meta">{item.office}</span>
                  {item.status === "Pendiente" ? (
                    <span className="slot-entry-meta">Pendiente de tu confirmacion.</span>
                  ) : item.status === "Confirmado" ? (
                    <span className="slot-entry-meta">Turno confirmado.</span>
                  ) : item.status === "Completado" ? (
                    <span className="slot-entry-meta">Consulta completada.</span>
                  ) : null}
                </ListEntry>
              ))
            ) : (
              <span className="meta">
                {appointmentView === "cancelled"
                  ? "Todavia no hay turnos cancelados."
                  : "Todavia no hay turnos proximos."}
              </span>
            )}
          </div>
        </section>
      ) : null}

      {section === "prescriptions" ? (
        <section className="page-stack">
          <h2 className="title-md">Recetas</h2>
          <div className="dashboard-plain-list">
            {query.data.prescriptions.length ? (
              query.data.prescriptions.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.medication}
                  action={
                    <Link to={`/patient/prescriptions/${item.id}`}>
                      <Button variant="ghost">Ver receta</Button>
                    </Link>
                  }
                >
                  <span className="slot-entry-meta">{item.professionalName}</span>
                  <span className="slot-entry-meta">{item.dose || "Sin detalle de dosis"}</span>
                </ListEntry>
              ))
            ) : (
              <span className="meta">Todavia no hay recetas registradas.</span>
            )}
          </div>
        </section>
      ) : null}

      {section === "studies" ? (
        <section className="page-stack">
          <div className="row-between">
            <h2 className="title-md">Estudios</h2>
            <Button onClick={() => setIsCreatingStudy(true)}>Agregar estudio</Button>
          </div>
          <div className="dashboard-plain-list">
            {studiesQuery.isLoading ? (
              <span className="meta">Cargando estudios...</span>
            ) : studiesQuery.isError ? (
              <span className="field-error">No pudimos cargar los estudios.</span>
            ) : studyRows.length ? (
              studyRows.map((item) => (
                <ListEntry
                  key={item.id}
                  title={item.title}
                  action={
                    <div className="row-wrap appointment-actions">
                      <Link to={`/patient/studies/${item.id}`}>
                        <Button variant="ghost">Abrir</Button>
                      </Link>
                      <Button variant="ghost" onClick={() => setEditingStudy(item)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setStudyToDelete(item)}>
                        Eliminar
                      </Button>
                    </div>
                  }
                >
                  <span className="slot-entry-meta">{item.requestedBy}</span>
                  <span className="slot-entry-meta">{item.summary}</span>
                </ListEntry>
              ))
            ) : (
              <span className="meta">Todavia no hay estudios registrados.</span>
            )}
          </div>
        </section>
      ) : null}

      <StudyEditorModal
        isOpen={isCreatingStudy}
        isSubmitting={createStudyMutation.isPending}
        onClose={() => setIsCreatingStudy(false)}
        onSubmit={async (values) => {
          await createStudyMutation.mutateAsync(values);
        }}
      />
      {createStudyMutation.isError ? (
        <span className="field-error">
          {createStudyMutation.error instanceof Error
            ? createStudyMutation.error.message
            : "No se pudo crear el estudio."}
        </span>
      ) : null}

      <StudyEditorModal
        isOpen={Boolean(editingStudy)}
        study={editingStudy}
        isSubmitting={updateStudyMutation.isPending}
        onClose={() => setEditingStudy(null)}
        onSubmit={async (values) => {
          if (!editingStudy) return;
          await updateStudyMutation.mutateAsync({
            id: editingStudy.id,
            ...values,
          });
        }}
      />
      {updateStudyMutation.isError ? (
        <span className="field-error">
          {updateStudyMutation.error instanceof Error
            ? updateStudyMutation.error.message
            : "No se pudo actualizar el estudio."}
        </span>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(studyToDelete)}
        title="Eliminar estudio"
        description="Esta accion quitara el estudio del historial del paciente."
        tone="danger"
        confirmLabel={deleteStudyMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setStudyToDelete(null)}
        onConfirm={() => {
          if (!studyToDelete || deleteStudyMutation.isPending) return;
          deleteStudyMutation.mutate(studyToDelete.id);
        }}
      />
      {deleteStudyMutation.isError ? (
        <span className="field-error">
          {deleteStudyMutation.error instanceof Error
            ? deleteStudyMutation.error.message
            : "No se pudo eliminar el estudio."}
        </span>
      ) : null}
    </div>
  );
}
