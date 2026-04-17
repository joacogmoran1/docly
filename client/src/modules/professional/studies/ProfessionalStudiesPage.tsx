import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { StudyEditorModal, type StudyEditorValues } from "@/modules/patient/dashboard/StudyEditorModal";
import {
  ProfessionalPatientSelector,
  type ProfessionalSelectablePatient,
} from "@/modules/professional/patients/ProfessionalPatientSelector";
import { createStudy, deleteStudy, getProfessionalStudies } from "@/modules/studies/api/studies.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

function getPatientName(study: Awaited<ReturnType<typeof getProfessionalStudies>>[number]) {
  return study.patient?.user
    ? [study.patient.user.name, study.patient.user.lastName].filter(Boolean).join(" ")
    : "Paciente";
}

export function ProfessionalStudiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ProfessionalSelectablePatient | null>(null);
  const [studyToDelete, setStudyToDelete] = useState<{ id: string; title: string; patientId: string } | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.professionalStudies, professionalId],
    queryFn: () => getProfessionalStudies(professionalId),
    enabled: Boolean(professionalId),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((study) => {
      const patientName = getPatientName(study).toLowerCase();
      const matchesPatient = patientId === "all" || study.patientId === patientId;
      const matchesSearch =
        !term ||
        study.type.toLowerCase().includes(term) ||
        patientName.includes(term) ||
        (study.notes ?? "").toLowerCase().includes(term);

      return matchesPatient && matchesSearch;
    });
  }, [patientId, query.data, search]);

  const patientOptions = useMemo(() => {
    const registry = new Map<string, string>();
    (query.data ?? []).forEach((study) => {
      registry.set(study.patientId, getPatientName(study));
    });

    return [
      { value: "all", label: "Todos los pacientes" },
      ...Array.from(registry.entries())
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [query.data]);

  const createMutation = useMutation({
    mutationFn: (values: StudyEditorValues) => {
      if (!selectedPatient) {
        throw new Error("Selecciona un paciente antes de cargar el estudio.");
      }

      return createStudy({
        patientId: selectedPatient.id,
        professionalId,
        type: values.type,
        date: values.date,
        results: values.reportContent,
        fileUrl: values.attachmentContent,
      });
    },
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalStudies, professionalId] }),
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalPatients, professionalId] }),
      ];
      if (selectedPatient) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(selectedPatient.id),
          }),
        );
      }
      await Promise.all(invalidations);
      setFeedback({
        tone: "success",
        message: selectedPatient?.isLinked
          ? "Estudio cargado correctamente."
          : `Estudio cargado y primer vinculo creado con ${selectedPatient?.fullName ?? "el paciente"}.`,
      });
      setIsEditorOpen(false);
      setIsCreating(false);
      setSelectedPatient(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar el estudio.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studyId: string) => deleteStudy(studyId),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalStudies, professionalId] }),
      ];
      if (studyToDelete) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(studyToDelete.patientId),
          }),
        );
      }
      await Promise.all(invalidations);
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

  if (query.isLoading) {
    return <div className="centered-feedback">Cargando estudios...</div>;
  }

  if (query.isError || !query.data) {
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
        title="Estudios del profesional"
        description="Lista, filtra y carga estudios desde un modulo propio del profesional."
        className="panel-separated"
        action={
          <Button
            variant={isCreating ? "ghost" : "primary"}
            onClick={() => {
              setIsCreating((current) => !current);
              setSelectedPatient(null);
            }}
          >
            {isCreating ? "Cancelar" : "Nuevo estudio"}
          </Button>
        }
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por paciente, tipo o nota"
            value={search}
            onChange={setSearch}
          />
          <select
            className="select-base"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          >
            {patientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isCreating ? (
        <Card
          title="Preparar carga"
          description="Selecciona uno de tus pacientes vinculados para cargar el estudio."
          className="panel-separated"
        >
          <div className="minimal-form">
            <ProfessionalPatientSelector
              professionalId={professionalId}
              value={selectedPatient?.id ?? ""}
              onChange={setSelectedPatient}
              newPatientMessage="Al guardar el estudio se creara tambien el primer vinculo con este paciente."
            />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cerrar
              </Button>
              <Button onClick={() => setIsEditorOpen(true)} disabled={!selectedPatient}>
                Continuar carga
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card title="Resultados" className="panel-separated">
        <div className="plain-list">
          {rows.length ? (
            rows.map((study) => (
              <div key={study.id} className="list-row">
                <div className="stack-sm">
                  <strong>{study.type}</strong>
                  <span className="meta">{getPatientName(study)}</span>
                  <span className="meta">{formatNumericDate(study.date)}</span>
                </div>
                <div className="row-wrap">
                  <Link to={`/professional/studies/${study.id}`}>
                    <Button variant="ghost">Abrir detalle</Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={() => setStudyToDelete({ id: study.id, title: study.type, patientId: study.patientId })}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="meta">No hay estudios para los filtros actuales.</span>
          )}
        </div>
      </Card>

      <StudyEditorModal
        isOpen={isEditorOpen}
        isSubmitting={createMutation.isPending}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(studyToDelete)}
        title="Eliminar estudio"
        description={`Se eliminara "${studyToDelete?.title ?? "este estudio"}" del modulo profesional.`}
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
