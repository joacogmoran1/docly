import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientProfile, updatePatientProfile } from "@/modules/patient/api/patient.api";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  bloodTypeOptions,
  patientCoverageOptions,
} from "@/shared/constants/medical-options";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import type { PatientProfileView } from "@/services/api/mappers";

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

      <div className="settings-layout">
        <div className="settings-main-column">
          <Card title="Datos principales" className="panel-separated">
            <div className="minimal-form">
              <Input
                label="Nombre"
                value={form.name}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, name: event.target.value } : current))
                }
              />
              <Input
                label="Apellido"
                value={form.lastName}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, lastName: event.target.value } : current,
                  )
                }
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={form.birthDate}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, birthDate: event.target.value } : current,
                  )
                }
              />
              <Input
                label="Telefono"
                value={form.phone}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, phone: event.target.value } : current))
                }
              />
              <Select
                label="Genero"
                options={genderOptions}
                value={form.gender}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, gender: event.target.value } : current))
                }
              />
              <Select
                label="Grupo sanguineo"
                options={bloodTypeOptions}
                value={form.bloodType}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, bloodType: event.target.value } : current,
                  )
                }
              />
              <Select
                label="Cobertura"
                options={patientCoverageOptions.filter((option) => option.value !== "__OTHER__")}
                value={form.coverage}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, coverage: event.target.value } : current))
                }
              />
              <Input
                label="Numero de afiliado"
                value={form.coverageNumber}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, coverageNumber: event.target.value } : current,
                  )
                }
              />
            </div>
          </Card>
        </div>

        <aside className="settings-side-column">
          <Card title="Edicion" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Actualiza tus datos personales y de cobertura desde esta seccion.
              </p>
              {editing ? (
                <>
                  <Button
                    fullWidth
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
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
                </>
              ) : (
                <Button fullWidth onClick={() => setEditing(true)}>
                  Editar perfil
                </Button>
              )}
              {serverError ? <span className="field-error">{serverError}</span> : null}
            </div>
          </Card>

          <Card title="Resumen" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Revisa y manten actualizados tus datos personales, cobertura y telefono de contacto.
              </p>
              <span className="meta">{form.fullName || "Paciente"}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
