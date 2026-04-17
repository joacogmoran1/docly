import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPatientMedicalRecords } from "@/modules/medical-records/api/medical-records.api";
import { getPatientTeamProfessionals } from "@/modules/patient/api/patient.api";
import { mapMedicalRecordToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { formatNumericDate } from "@/shared/utils/date";

function getProfessionalName(record: Awaited<ReturnType<typeof getPatientMedicalRecords>>[number]) {
  return record.professional?.user
    ? [record.professional.user.name, record.professional.user.lastName].filter(Boolean).join(" ")
    : "Profesional";
}

export function PatientRecordsPage() {
  const { user } = useAuth();
  const patientId = user?.patientId ?? "";
  const [search, setSearch] = useState("");
  const [professionalId, setProfessionalId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const recordsQuery = useQuery({
    queryKey: [...queryKeys.patientMedicalRecords, patientId, professionalId, startDate, endDate, search],
    queryFn: () =>
      getPatientMedicalRecords(patientId, {
        professionalId: professionalId === "all" ? undefined : professionalId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(patientId),
  });

  const professionalsQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionals, patientId, "records-filter"],
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

  if (recordsQuery.isLoading || professionalsQuery.isLoading) {
    return <div className="centered-feedback">Cargando registros...</div>;
  }

  if (recordsQuery.isError || professionalsQuery.isError || !recordsQuery.data) {
    return <div className="centered-feedback">No pudimos cargar tus registros.</div>;
  }

  return (
    <div className="page-stack">
      <Card
        title="Registros medicos"
        description="Consulta tu historial clinico con filtros por profesional, fecha y texto."
        className="panel-separated"
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por motivo, diagnostico o indicaciones"
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Profesional"
            options={professionalOptions}
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
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
          {recordsQuery.data.length ? (
            recordsQuery.data
              .slice()
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((record) => {
                const item = mapMedicalRecordToItem(record);
                return (
                  <div key={record.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.title}</strong>
                      <span className="meta">{getProfessionalName(record)}</span>
                      <span className="meta">{formatNumericDate(record.date)}</span>
                      <span className="meta">{item.summary}</span>
                    </div>
                    <div className="row-wrap">
                      <Link to={`/patient/records/${record.id}`}>
                        <Button variant="ghost">Abrir detalle</Button>
                      </Link>
                      <Link to={`/patient/professionals/${record.professionalId}?tab=records`}>
                        <Button variant="ghost">Ver profesional</Button>
                      </Link>
                    </div>
                  </div>
                );
              })
          ) : (
            <span className="meta">No hay registros para los filtros actuales.</span>
          )}
        </div>
      </Card>
    </div>
  );
}
