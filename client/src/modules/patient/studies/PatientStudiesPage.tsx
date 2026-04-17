import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createStudy, deleteStudy, getPatientStudies, updateStudy } from "@/modules/studies/api/studies.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { StudyEditorModal, type StudyEditorValues } from "@/modules/patient/dashboard/StudyEditorModal";
import { getPatientTeamProfessionals } from "@/modules/patient/api/patient.api";
import { mapStudyToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { studyTypeOptions } from "@/shared/constants/medical-options";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { ApiStudy } from "@/shared/types/api";
import { formatNumericDate } from "@/shared/utils/date";

function getRequestedBy(study: ApiStudy) {
  return study.professional?.user
    ? [study.professional.user.name, study.professional.user.lastName].filter(Boolean).join(" ")
    : "Paciente";
}

export function PatientStudiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const [search, setSearch] = useState("");
  const [professionalId, setProfessionalId] = useState("all");
  const [type, setType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingStudy, setEditingStudy] = useState<ApiStudy | null>(null);
  const [isCreatingStudy, setIsCreatingStudy] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<ApiStudy | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );

  const studiesQuery = useQuery({
    queryKey: [...queryKeys.patientStudies, patientId, professionalId, type, startDate, endDate],
    queryFn: () =>
      getPatientStudies(patientId, {
        professionalId: professionalId === "all" ? undefined : professionalId,
        type: type === "all" ? undefined : type,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: Boolean(patientId),
  });

  const professionalsQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionals, patientId, "studies-filter"],
    queryFn: () => getPatientTeamProfessionals(patientId),
    enabled: Boolean(patientId),
  });

  const professionalOptions = useMemo(
    () => [
      { value: "all", label: "Todos los profesionales" },
      ...(professionalsQuery.data ?? [])
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((professional) => ({ value: professional.id, label: professional.fullName })),
    ],
    [professionalsQuery.data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (studiesQuery.data ?? []).filter((study) => {
      const requestedBy = getRequestedBy(study).toLowerCase();
      return (
        !term ||
        study.type.toLowerCase().includes(term) ||
        requestedBy.includes(term) ||
        (study.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [search, studiesQuery.data]);

  const invalidateStudyQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.patientStudies }),
      queryClient.invalidateQueries({ queryKey: queryKeys.patientDashboard }),
    ]);
  };

  const createMutation = useMutation({
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
      await invalidateStudyQueries();
      setFeedback({ tone: "success", message: "Estudio cargado correctamente." });
      setIsCreatingStudy(false);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar el estudio.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: StudyEditorValues & { id: string }) =>
      updateStudy(values.id, {
        type: values.type,
        date: values.date,
        results: values.reportContent || undefined,
        fileUrl: values.attachmentContent || undefined,
      }),
    onSuccess: async () => {
      await invalidateStudyQueries();
      setFeedback({ tone: "success", message: "Estudio actualizado correctamente." });
      setEditingStudy(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar el estudio.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studyId: string) => deleteStudy(studyId),
    onSuccess: async () => {
      await invalidateStudyQueries();
      setFeedback({ tone: "success", message: "Estudio eliminado correctamente." });
      setStudyToDelete(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar el estudio.",
      });
      setStudyToDelete(null);
    },
  });

  if (studiesQuery.isLoading || professionalsQuery.isLoading) {
    return <div className="centered-feedback">Cargando estudios...</div>;
  }

  if (studiesQuery.isError || professionalsQuery.isError || !studiesQuery.data) {
    return <div className="centered-feedback">No pudimos cargar los estudios.</div>;
  }

  return (
    <div className="page-stack">
      {feedback ? (
        <div className={`feedback-banner${feedback.tone === "error" ? " is-error" : " is-success"}`}>
          <span>{feedback.message}</span>
          <Button variant="ghost" className="button-inline" onClick={() => setFeedback(null)}>
            Cerrar
          </Button>
        </div>
      ) : null}

      <Card
        title="Estudios"
        description="Consulta y administra tus estudios desde un modulo dedicado."
        className="panel-separated"
        action={
          <Button
            variant={isCreatingStudy ? "ghost" : "primary"}
            onClick={() => setIsCreatingStudy((current) => !current)}
          >
            {isCreatingStudy ? "Cancelar" : "Agregar estudio"}
          </Button>
        }
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por tipo, profesional o nota"
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Profesional"
            options={professionalOptions}
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          />
          <Select
            label="Tipo"
            options={[{ value: "all", label: "Todos los tipos" }, ...studyTypeOptions]}
            value={type}
            onChange={(event) => setType(event.target.value)}
          />
          <Input
            label="Desde"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Resultados" className="panel-separated">
        <div className="plain-list">
          {rows.length ? (
            rows
              .slice()
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((study) => {
                const item = mapStudyToItem(study);
                return (
                  <div key={study.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.title}</strong>
                      <span className="meta">{getRequestedBy(study)}</span>
                      <span className="meta">{formatNumericDate(study.date)}</span>
                      <span className="meta">{item.reportSummary}</span>
                    </div>
                    <div className="row-wrap">
                      <Link to={`/patient/studies/${study.id}`}>
                        <Button variant="ghost">Abrir</Button>
                      </Link>
                      <Button variant="ghost" onClick={() => setEditingStudy(study)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setStudyToDelete(study)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })
          ) : (
            <span className="meta">No hay estudios para los filtros actuales.</span>
          )}
        </div>
      </Card>

      <StudyEditorModal
        isOpen={isCreatingStudy}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsCreatingStudy(false)}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <StudyEditorModal
        isOpen={Boolean(editingStudy)}
        study={editingStudy}
        isSubmitting={updateMutation.isPending}
        onClose={() => setEditingStudy(null)}
        onSubmit={async (values) => {
          if (!editingStudy) return;
          await updateMutation.mutateAsync({ ...values, id: editingStudy.id });
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(studyToDelete)}
        title="Eliminar estudio"
        description={`Se eliminara "${studyToDelete?.type ?? "este estudio"}".`}
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setStudyToDelete(null)}
        onConfirm={() => {
          if (!studyToDelete || deleteMutation.isPending) return;
          deleteMutation.mutate(studyToDelete.id);
        }}
      />
    </div>
  );
}
