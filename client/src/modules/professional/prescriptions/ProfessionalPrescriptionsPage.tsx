import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalPatients } from "@/modules/professional/api/professional.api";
import { getProfessionalPrescriptions } from "@/modules/prescriptions/api/prescriptions.api";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { PrescriptionDetailView } from "@/shared/components/PrescriptionDetailView";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";

export function ProfessionalPrescriptionsPage() {
  const { user } = useAuth();
  const professionalId = user?.professionalId ?? "";
  const [patientId, setPatientId] = useState("all");
  const query = useQuery({
    queryKey: [...queryKeys.professionalPrescriptions, professionalId, patientId],
    queryFn: () =>
      getProfessionalPrescriptions(professionalId, {
        patientId: patientId === "all" ? undefined : patientId,
      }),
    enabled: Boolean(professionalId),
  });
  const patientsQuery = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId, "selector"],
    queryFn: () => getProfessionalPatients(professionalId),
    enabled: Boolean(professionalId),
  });

  const patientOptions = (patientsQuery.data ?? []).map((patient) => ({
    value: patient.id,
    label: patient.fullName,
  }));

  if (query.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando recetas...</div>;
  }
  if (query.isError || patientsQuery.isError || !query.data) {
    return <div className="centered-feedback">No pudimos cargar recetas.</div>;
  }

  return (
    <div className="page-stack">
      <Card title="Recetas emitidas" className="panel-separated">
        <div className="minimal-form">
          <Select
            label="Paciente"
            options={[{ value: "all", label: "Todos los pacientes" }, ...patientOptions]}
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />
        </div>
      </Card>

      <div className="page-stack">
        {query.data.length ? (
          query.data.map((prescription) => (
            <PrescriptionDetailView
              key={prescription.id}
              prescription={mapPrescriptionToItem(prescription)}
            />
          ))
        ) : (
          <div className="panel">
            <strong>Sin recetas</strong>
            <p className="meta">Todavia no hay recetas emitidas para este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
