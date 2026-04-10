import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientProfile, updatePatientProfile } from "@/modules/patient/api/patient.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import type { PatientProfileView } from "@/services/api/mappers";

const coverageOptions = [
  { value: "", label: "Seleccionar cobertura" },
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
  { value: "Particular", label: "Particular" },
  { value: "Sin cobertura", label: "Sin cobertura" },
];

const genderOptions = [
  { value: "", label: "Seleccionar genero" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

export function PatientProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PatientProfileView | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: [...queryKeys.patientProfile, patientId],
    queryFn: () => getPatientProfile(patientId),
    enabled: Boolean(patientId),
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      updatePatientProfile(patientId, {
        name: form?.name || undefined,
        lastName: form?.lastName || undefined,
        phone: form?.phone || undefined,
        birthDate: form?.birthDate || undefined,
        gender: form?.gender || undefined,
        bloodType: form?.bloodType || undefined,
        medicalCoverage: form?.coverage || undefined,
        coverageNumber: form?.coverageNumber || undefined,
      }),
    onSuccess: async (nextProfile) => {
      setForm(nextProfile);
      setEditing(false);
      setServerError(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientProfile, patientId],
      });
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el perfil.");
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm(query.data);
    }
  }, [query.data]);

  if (query.isLoading || !form) return <div className="centered-feedback">Cargando perfil...</div>;
  if (query.isError) return <div className="centered-feedback">No pudimos cargar el perfil.</div>;

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
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    if (query.data) {
                      setForm(query.data);
                    }
                    setServerError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
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
          <Input
            label="Nombre"
            value={form.name}
            disabled={!editing}
            onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
          />
          <Input
            label="Apellido"
            value={form.lastName}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, lastName: event.target.value } : current)
            }
          />
          <Input label="Email" value={form.email} disabled />
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={form.birthDate}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, birthDate: event.target.value } : current)
            }
          />
          <Input
            label="Telefono"
            value={form.phone}
            disabled={!editing}
            onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)}
          />
          <Select
            label="Genero"
            options={genderOptions}
            value={form.gender}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, gender: event.target.value } : current)
            }
          />
          <Input
            label="Grupo sanguineo"
            value={form.bloodType}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, bloodType: event.target.value } : current)
            }
          />
          <Select
            label="Cobertura"
            options={coverageOptions}
            value={form.coverage}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, coverage: event.target.value } : current)
            }
          />
          <Input
            label="Numero de afiliado"
            value={form.coverageNumber}
            disabled={!editing}
            onChange={(event) =>
              setForm((current) => current ? { ...current, coverageNumber: event.target.value } : current)
            }
          />
          {serverError ? <span className="field-error">{serverError}</span> : null}
        </div>
      </Card>
    </div>
  );
}
