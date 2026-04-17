import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProfessionalPatients,
  searchPatientsForProfessional,
} from "@/modules/professional/api/professional.api";
import { SearchBar } from "@/shared/components/SearchBar";
import { queryKeys } from "@/shared/constants/query-keys";
import { Badge } from "@/shared/ui/Badge";
import { Select } from "@/shared/ui/Select";
import type { PatientListItem } from "@/shared/types/domain";
import type { ApiPatientProfile } from "@/shared/types/api";

export interface ProfessionalSelectablePatient {
  id: string;
  fullName: string;
  coverage: string;
  document: string;
  email: string;
  phone: string;
  meta: string;
  isLinked: boolean;
}

interface ProfessionalPatientSelectorProps {
  professionalId: string;
  value: string;
  onChange: (patient: ProfessionalSelectablePatient | null) => void;
  label?: string;
  linkedOnly?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  newPatientMessage?: string;
  autoSelectFirst?: boolean;
}

function buildFullName(name: string, lastName?: string | null) {
  return [name, lastName].filter(Boolean).join(" ").trim();
}

function matchesPatient(patient: ProfessionalSelectablePatient, search: string) {
  const term = search.toLowerCase();
  return (
    patient.fullName.toLowerCase().includes(term) ||
    patient.meta.toLowerCase().includes(term) ||
    patient.coverage.toLowerCase().includes(term) ||
    patient.document.toLowerCase().includes(term)
  );
}

function mapLinkedPatient(patient: PatientListItem): ProfessionalSelectablePatient {
  const document = patient.document || patient.email || patient.phone || "Sin documento";
  return {
    id: patient.id,
    fullName: patient.fullName,
    coverage: patient.coverage,
    document,
    email: patient.email ?? "",
    phone: patient.phone ?? "",
    meta: patient.email ?? patient.phone ?? document,
    isLinked: true,
  };
}

function mapSearchedPatient(
  patient: ApiPatientProfile,
  linkedIds: Set<string>,
): ProfessionalSelectablePatient {
  const fullName = buildFullName(patient.user.name, patient.user.lastName);
  const document = patient.dni ?? patient.user.email;
  return {
    id: patient.id,
    fullName,
    coverage: patient.medicalCoverage ?? "Sin cobertura",
    document,
    email: patient.user.email,
    phone: patient.user.phone ?? "",
    meta: patient.user.email ?? patient.user.phone ?? document,
    isLinked: linkedIds.has(patient.id),
  };
}

export function ProfessionalPatientSelector({
  professionalId,
  value,
  onChange,
  label = "Paciente",
  linkedOnly = false,
  disabled = false,
  searchPlaceholder = "Buscar por nombre, documento o contacto",
  emptyStateMessage = "No encontramos pacientes para esa busqueda.",
  newPatientMessage = "Solo se pueden usar pacientes ya vinculados con tu cuenta profesional.",
  autoSelectFirst = false,
}: ProfessionalPatientSelectorProps) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim();

  const linkedPatientsQuery = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId, "selector"],
    queryFn: () => getProfessionalPatients(professionalId),
    enabled: Boolean(professionalId),
  });

  const remoteSearchQuery = useQuery({
    queryKey: [...queryKeys.professionalPatientSearch, professionalId, normalizedSearch],
    queryFn: () => searchPatientsForProfessional(normalizedSearch),
    enabled: Boolean(professionalId) && !linkedOnly && normalizedSearch.length >= 2,
  });

  const linkedPatients = useMemo(
    () => (linkedPatientsQuery.data ?? []).map(mapLinkedPatient),
    [linkedPatientsQuery.data],
  );
  const linkedIds = useMemo(
    () => new Set(linkedPatients.map((patient) => patient.id)),
    [linkedPatients],
  );
  const searchedPatients = useMemo(
    () => (remoteSearchQuery.data ?? []).map((patient) => mapSearchedPatient(patient, linkedIds)),
    [linkedIds, remoteSearchQuery.data],
  );

  const visiblePatients = useMemo(() => {
    const filteredLinked = normalizedSearch
      ? linkedPatients.filter((patient) => matchesPatient(patient, normalizedSearch))
      : linkedPatients;

    if (linkedOnly || normalizedSearch.length < 2) {
      return filteredLinked;
    }

    const registry = new Map<string, ProfessionalSelectablePatient>();
    [...filteredLinked, ...searchedPatients].forEach((patient) => {
      registry.set(patient.id, patient);
    });
    return Array.from(registry.values()).sort((left, right) =>
      left.fullName.localeCompare(right.fullName),
    );
  }, [linkedOnly, linkedPatients, normalizedSearch, searchedPatients]);

  const patientRegistry = useMemo(() => {
    const registry = new Map<string, ProfessionalSelectablePatient>();
    [...linkedPatients, ...searchedPatients].forEach((patient) => {
      registry.set(patient.id, patient);
    });
    return registry;
  }, [linkedPatients, searchedPatients]);

  const selectedPatient = value ? patientRegistry.get(value) ?? null : null;

  useEffect(() => {
    if (!autoSelectFirst || value || !visiblePatients.length) {
      return;
    }

    onChange(visiblePatients[0] ?? null);
  }, [autoSelectFirst, onChange, value, visiblePatients]);

  useEffect(() => {
    if (!value) {
      return;
    }

    if (patientRegistry.has(value)) {
      return;
    }

    onChange(null);
  }, [onChange, patientRegistry, value]);

  const options = visiblePatients.length
    ? [{ value: "", label: "Seleccionar paciente" }, ...visiblePatients.map((patient) => ({
        value: patient.id,
        label: `${patient.isLinked ? "" : "[Nuevo] "}${patient.fullName} - ${patient.meta}`,
      }))]
    : [{ value: "", label: emptyStateMessage }];

  const isLoading = linkedPatientsQuery.isLoading || remoteSearchQuery.isLoading;
  const hasError = linkedPatientsQuery.isError || remoteSearchQuery.isError;
  const errorMessage =
    linkedPatientsQuery.error instanceof Error
      ? linkedPatientsQuery.error.message
      : remoteSearchQuery.error instanceof Error
        ? remoteSearchQuery.error.message
        : "No se pudieron cargar pacientes.";

  return (
    <div className="stack-sm">
      <SearchBar placeholder={searchPlaceholder} value={search} onChange={setSearch} />
      <Select
        label={label}
        options={options}
        value={value}
        disabled={disabled || isLoading || hasError || !visiblePatients.length}
        onChange={(event) => onChange(patientRegistry.get(event.target.value) ?? null)}
      />

      {hasError ? <span className="field-error">{errorMessage}</span> : null}

      {!linkedOnly && normalizedSearch.length > 0 && normalizedSearch.length < 2 ? (
        <span className="meta">Escribe al menos 2 caracteres para filtrar pacientes vinculados.</span>
      ) : null}

      {selectedPatient ? (
        <div className="stack-sm">
          <span className="meta">
            {selectedPatient.coverage} - {selectedPatient.document}
          </span>
          {!selectedPatient.isLinked ? (
            <div className="stack-sm">
              <Badge variant="info">Primer vinculo</Badge>
              <span className="meta">{newPatientMessage}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
