import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalMedicalRecords } from "@/modules/medical-records/api/medical-records.api";
import { getProfessionalPatients } from "@/modules/professional/api/professional.api";
import { mapMedicalRecordToItem } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { formatNumericDate } from "@/shared/utils/date";

function getPatientName(record: Awaited<ReturnType<typeof getProfessionalMedicalRecords>>[number]) {
  return record.patient?.user
    ? [record.patient.user.name, record.patient.user.lastName].filter(Boolean).join(" ")
    : "Paciente";
}

export function ProfessionalMedicalRecordsPage() {
  const { user } = useAuth();
  const professionalId = user?.professionalId ?? "";
  const [patientId, setPatientId] = useState("all");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const recordsQuery = useQuery({
    queryKey: [...queryKeys.professionalMedicalRecords, professionalId, patientId, date],
    queryFn: () =>
      getProfessionalMedicalRecords(professionalId, {
        patientId: patientId === "all" ? undefined : patientId,
        date: date || undefined,
      }),
    enabled: Boolean(professionalId),
  });

  const patientsQuery = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId, "records-filter"],
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
    return (recordsQuery.data ?? []).filter((record) => {
      const patientName = getPatientName(record).toLowerCase();
      return (
        !term ||
        patientName.includes(term) ||
        record.reason.toLowerCase().includes(term) ||
        record.diagnosis.toLowerCase().includes(term) ||
        record.indications.toLowerCase().includes(term) ||
        (record.evolution ?? "").toLowerCase().includes(term)
      );
    });
  }, [recordsQuery.data, search]);

  if (recordsQuery.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando registros...</div>;
  }

  if (recordsQuery.isError || patientsQuery.isError || !recordsQuery.data) {
    return <div className="centered-feedback">No pudimos cargar los registros del profesional.</div>;
  }

  return (
    <div className="page-stack">
      <Card
        title="Registros medicos"
        description="Modulo global para revisar, buscar y abrir registros de todos tus pacientes."
        className="panel-separated"
        action={
          <Link to="/professional/patients/new-record">
            <Button>Nuevo registro</Button>
          </Link>
        }
      >
        <div className="minimal-form">
          <SearchBar
            placeholder="Buscar por paciente, motivo, diagnostico o indicaciones"
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Paciente"
            options={patientOptions}
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </Card>

      <Card title="Resultados" className="panel-separated">
        <div className="plain-list">
          {rows.length ? (
            rows
              .slice()
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((record) => {
                const item = mapMedicalRecordToItem(record);
                return (
                  <div key={record.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.title}</strong>
                      <span className="meta">{getPatientName(record)}</span>
                      <span className="meta">{formatNumericDate(record.date)}</span>
                      <span className="meta">{item.summary}</span>
                    </div>
                    <div className="row-wrap">
                      <Link to={`/professional/records/${record.id}`}>
                        <Button variant="ghost">Abrir detalle</Button>
                      </Link>
                      <Link to={`/professional/patients/${record.patientId}?tab=records`}>
                        <Button variant="ghost">Ver ficha</Button>
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
