import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPatientTeamProfessionals } from "@/modules/patient/api/patient.api";
import { getPatientPrescriptions } from "@/modules/prescriptions/api/prescriptions.api";
import { mapPrescriptionToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { formatNumericDate } from "@/shared/utils/date";

export function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const patientId = user?.patientId ?? "";
  const [search, setSearch] = useState("");
  const [professionalId, setProfessionalId] = useState("all");
  const [validity, setValidity] = useState("all");

  const prescriptionsQuery = useQuery({
    queryKey: [...queryKeys.patientPrescriptions, patientId, professionalId, validity, search],
    queryFn: () =>
      getPatientPrescriptions(patientId, {
        professionalId: professionalId === "all" ? undefined : professionalId,
        valid: validity === "valid",
        search: search || undefined,
      }),
    enabled: Boolean(patientId),
  });

  const professionalsQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionals, patientId, "prescriptions-filter"],
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

  if (prescriptionsQuery.isLoading || professionalsQuery.isLoading) {
    return <div className="centered-feedback">Cargando recetas...</div>;
  }

  if (prescriptionsQuery.isError || professionalsQuery.isError || !prescriptionsQuery.data) {
    return <div className="centered-feedback">No pudimos cargar las recetas.</div>;
  }

  return (
    <div className="page-stack">
      <Card
        title="Recetas"
        description="Consulta tus recetas en un modulo global con filtros por profesional y vigencia."
        className="panel-separated"
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por medicacion, diagnostico o indicaciones"
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
            label="Vigencia"
            options={[
              { value: "all", label: "Todas" },
              { value: "valid", label: "Solo vigentes" },
            ]}
            value={validity}
            onChange={(event) => setValidity(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Resultados" className="panel-separated">
        <div className="plain-list">
          {prescriptionsQuery.data.length ? (
            prescriptionsQuery.data
              .slice()
              .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
              .map((prescription) => {
                const item = mapPrescriptionToItem(prescription);
                return (
                  <div key={prescription.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.medication}</strong>
                      <span className="meta">{item.professionalName}</span>
                      <span className="meta">{formatNumericDate(item.date)}</span>
                      <span className="meta">{item.dose || "Sin detalle de dosis"}</span>
                    </div>
                    <Link to={`/patient/prescriptions/${prescription.id}`}>
                      <Button variant="ghost">Ver receta</Button>
                    </Link>
                  </div>
                );
              })
          ) : (
            <span className="meta">No hay recetas para los filtros actuales.</span>
          )}
        </div>
      </Card>
    </div>
  );
}
