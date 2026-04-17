import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalPatients } from "@/modules/professional/api/professional.api";
import {
  ProfessionalPatientSelector,
  type ProfessionalSelectablePatient,
} from "@/modules/professional/patients/ProfessionalPatientSelector";
import { PrescriptionComposer } from "@/modules/professional/prescriptions/PrescriptionComposer";
import {
  deletePrescription,
  getProfessionalPrescriptions,
} from "@/modules/prescriptions/api/prescriptions.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { formatNumericDate } from "@/shared/utils/date";

function getPatientName(prescription: Awaited<ReturnType<typeof getProfessionalPrescriptions>>[number]) {
  return prescription.patient?.user
    ? [prescription.patient.user.name, prescription.patient.user.lastName].filter(Boolean).join(" ")
    : "Paciente";
}

export function ProfessionalPrescriptionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [patientId, setPatientId] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ProfessionalSelectablePatient | null>(null);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<{ id: string; title: string; patientId: string } | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.professionalPrescriptions, professionalId, patientId],
    queryFn: () =>
      getProfessionalPrescriptions(professionalId, {
        patientId: patientId === "all" ? undefined : patientId,
      }),
    enabled: Boolean(professionalId),
  });

  const patientsQuery = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId, "prescriptions-filter"],
    queryFn: () => getProfessionalPatients(professionalId),
    enabled: Boolean(professionalId),
  });

  const patientOptions = useMemo(
    () => [
      { value: "all", label: "Todos los pacientes" },
      ...(patientsQuery.data ?? [])
        .sort((left, right) => left.fullName.localeCompare(right.fullName))
        .map((patient) => ({ value: patient.id, label: patient.fullName })),
    ],
    [patientsQuery.data],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((prescription) => {
      const patientName = getPatientName(prescription).toLowerCase();
      const medicationSummary = prescription.medications
        .map((medication) => `${medication.name} ${medication.dose}`)
        .join(" ")
        .toLowerCase();

      return (
        !term ||
        patientName.includes(term) ||
        medicationSummary.includes(term) ||
        (prescription.diagnosis ?? "").toLowerCase().includes(term) ||
        (prescription.instructions ?? "").toLowerCase().includes(term)
      );
    });
  }, [query.data, search]);

  const deleteMutation = useMutation({
    mutationFn: (prescriptionId: string) => deletePrescription(prescriptionId),
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalPrescriptions] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.patientPrescriptions }),
      ];
      if (prescriptionToDelete) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: queryKeys.professionalPatientDetail(prescriptionToDelete.patientId),
          }),
        );
      }
      await Promise.all(invalidations);
      setFeedback({ tone: "success", message: "Receta eliminada correctamente." });
      setPrescriptionToDelete(null);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la receta.",
      });
      setPrescriptionToDelete(null);
    },
  });

  if (query.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando recetas...</div>;
  }

  if (query.isError || patientsQuery.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar recetas.</div>;
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
        title="Recetas del profesional"
        description="Modulo global para emitir, revisar y administrar recetas."
        className="panel-separated"
        action={
          <Button
            variant={isCreating ? "ghost" : "primary"}
            onClick={() => {
              setIsCreating((current) => !current);
              setSelectedPatient(null);
            }}
          >
            {isCreating ? "Cancelar" : "Nueva receta"}
          </Button>
        }
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por paciente, diagnostico o medicacion"
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Paciente"
            options={patientOptions}
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />
        </div>
      </Card>

      {isCreating ? (
        <Card
          title="Emitir receta"
          description="Las recetas nuevas solo pueden emitirse para pacientes que ya tengan vinculo con el profesional."
          className="panel-separated"
        >
          <div className="minimal-form">
            <ProfessionalPatientSelector
              professionalId={professionalId}
              value={selectedPatient?.id ?? ""}
              onChange={setSelectedPatient}
              linkedOnly
              emptyStateMessage="No hay pacientes vinculados disponibles para emitir recetas."
            />

            {selectedPatient ? (
              <PrescriptionComposer
                patientId={selectedPatient.id}
                professionalId={professionalId}
                patientName={selectedPatient.fullName}
                onCancel={() => setIsCreating(false)}
                onSuccess={async () => {
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: [...queryKeys.professionalPrescriptions] }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.patientPrescriptions }),
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.professionalPatientDetail(selectedPatient.id),
                    }),
                  ]);
                  setFeedback({ tone: "success", message: "Receta creada correctamente." });
                  setIsCreating(false);
                  setSelectedPatient(null);
                }}
              />
            ) : (
              <span className="meta">
                Selecciona un paciente ya vinculado para iniciar la receta.
              </span>
            )}
          </div>
        </Card>
      ) : null}

      <Card title="Recetas emitidas" className="panel-separated">
        <div className="plain-list">
          {rows.length ? (
            rows.map((prescription) => (
              <div key={prescription.id} className="list-row">
                <div className="stack-sm">
                  <strong>{prescription.medications[0]?.name ?? "Receta"}</strong>
                  <span className="meta">{getPatientName(prescription)}</span>
                  <span className="meta">{formatNumericDate(prescription.createdAt)}</span>
                </div>
                <div className="row-wrap">
                  <Link to={`/professional/prescriptions/${prescription.id}`}>
                    <Button variant="ghost">Abrir detalle</Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setPrescriptionToDelete({
                        id: prescription.id,
                        title: prescription.medications[0]?.name ?? "esta receta",
                        patientId: prescription.patientId,
                      })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="meta">Todavia no hay recetas emitidas para este filtro.</span>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={Boolean(prescriptionToDelete)}
        title="Eliminar receta"
        description={`Se eliminara "${prescriptionToDelete?.title ?? "esta receta"}" del modulo profesional.`}
        tone="danger"
        confirmLabel={deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
        onClose={() => setPrescriptionToDelete(null)}
        onConfirm={() => {
          if (!prescriptionToDelete || deleteMutation.isPending) return;
          deleteMutation.mutate(prescriptionToDelete.id);
        }}
      />
    </div>
  );
}
