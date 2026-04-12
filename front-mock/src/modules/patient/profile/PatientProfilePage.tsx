import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatientProfileMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

const coverageOptions = [
  { value: "OSDE", label: "OSDE" },
  { value: "Swiss Medical", label: "Swiss Medical" },
  { value: "Galeno", label: "Galeno" },
  { value: "Medife", label: "Medife" },
  { value: "Omint", label: "Omint" },
  { value: "Sancor Salud", label: "Sancor Salud" },
  { value: "Accord Salud", label: "Accord Salud" },
  { value: "Hospital Italiano", label: "Hospital Italiano" },
  { value: "Medicus", label: "Medicus" },
  { value: "Avalian", label: "Avalian" },
  { value: "Prevencion Salud", label: "Prevencion Salud" },
  { value: "Federada Salud", label: "Federada Salud" },
  { value: "Luis Pasteur", label: "Luis Pasteur" },
  { value: "Jerarquicos Salud", label: "Jerarquicos Salud" },
  { value: "OSECAC", label: "OSECAC" },
  { value: "OSDEPYM", label: "OSDEPYM" },
  { value: "OSPE", label: "OSPE" },
  { value: "OSUTHGRA", label: "OSUTHGRA" },
  { value: "OSPOCE", label: "OSPOCE" },
  { value: "Union Personal", label: "Union Personal" },
  { value: "IOMA", label: "IOMA" },
  { value: "PAMI", label: "PAMI" },
  { value: "IOSFA", label: "IOSFA" },
  { value: "Poder Judicial", label: "Obra Social del Poder Judicial" },
  { value: "Particular", label: "Particular" },
  { value: "Sin cobertura", label: "Sin cobertura" },
  { value: "Otra", label: "Otra" },
];

export function PatientProfilePage() {
  const [editing, setEditing] = useState(false);
  const [coverage, setCoverage] = useState("");
  const query = useQuery({
    queryKey: queryKeys.patientProfile,
    queryFn: getPatientProfileMock,
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando perfil...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el perfil.</div>;

  const selectedCoverage = coverage || query.data.coverage;
  const options = coverageOptions.some((option) => option.value === selectedCoverage)
    ? coverageOptions
    : [{ value: selectedCoverage, label: selectedCoverage }, ...coverageOptions];

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Perfil</h1>
      </div>

      <Card
        title="Datos principales"
        className="panel-separated"
        action={
          <div className="form-actions">
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setEditing(false)}>Guardar</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        }
      >
        <div className="minimal-form">
          <Input label="Nombre" defaultValue={query.data.fullName} disabled={!editing} />
          <Input label="Documento" defaultValue={query.data.document} disabled={!editing} />
          <Input label="Fecha de nacimiento" defaultValue={query.data.birthDate} disabled={!editing} />
          <Input label="Telefono" defaultValue={query.data.phone} disabled={!editing} />
          <Select
            label="Cobertura"
            options={options}
            value={selectedCoverage}
            disabled={!editing}
            onChange={(event) => setCoverage(event.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
