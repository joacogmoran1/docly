import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
} from "@/modules/professional/api/professional.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import type { ProfessionalProfileView } from "@/services/api/mappers";

interface ProfessionalProfileForm extends ProfessionalProfileView {
  acceptedCoveragesText: string;
}

export function ProfessionalProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfessionalProfileForm | null>(null);
  const query = useQuery({
    queryKey: [...queryKeys.professionalProfile, professionalId],
    queryFn: () => getProfessionalProfile(professionalId),
    enabled: Boolean(professionalId),
  });
  const updateMutation = useMutation({
    mutationFn: (section: "personal" | "professional") => {
      if (!form) {
        throw new Error("No hay datos para guardar.");
      }

      if (section === "personal") {
        return updateProfessionalProfile(professionalId, {
          name: form.name || undefined,
          lastName: form.lastName || undefined,
          phone: form.phone || undefined,
        });
      }

      return updateProfessionalProfile(professionalId, {
        specialty: form.specialty || undefined,
        licenseNumber: form.licenseNumber || undefined,
        acceptedCoverages: form.acceptedCoveragesText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        fees: form.fees ? Number(form.fees) : undefined,
      });
    },
    onSuccess: async (nextProfile) => {
      setForm({
        ...nextProfile,
        acceptedCoveragesText: nextProfile.acceptedCoverages.join(", "),
      });
      setEditingPersonal(false);
      setEditingProfessional(false);
      setServerError(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalProfile, professionalId],
      });
    },
    onError: (error) => {
      setServerError(
        error instanceof Error ? error.message : "No se pudo guardar el perfil profesional.",
      );
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        ...query.data,
        acceptedCoveragesText: query.data.acceptedCoverages.join(", "),
      });
    }
  }, [query.data]);

  if (query.isLoading || !form) return <div className="centered-feedback">Cargando perfil...</div>;
  if (query.isError) return <div className="centered-feedback">No pudimos cargar el perfil.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Perfil</h1>
      </div>

      <div className="cards-grid">
        <Card
          title="Datos personales"
          className="panel-separated"
          action={
            <div className="form-actions">
              {editingPersonal ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingPersonal(false);
                      setForm((current) =>
                        current && query.data
                          ? {
                              ...query.data,
                              acceptedCoveragesText: current.acceptedCoveragesText,
                            }
                          : current,
                      );
                      setServerError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => updateMutation.mutate("personal")} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setEditingPersonal(true)}>
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
              disabled={!editingPersonal}
              onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
            />
            <Input
              label="Apellido"
              value={form.lastName}
              disabled={!editingPersonal}
              onChange={(event) =>
                setForm((current) => current ? { ...current, lastName: event.target.value } : current)
              }
            />
            <Input label="Email" value={form.email} disabled />
            <Input
              label="Telefono"
              value={form.phone}
              disabled={!editingPersonal}
              onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)}
            />
          </div>
        </Card>

        <Card
          title="Datos profesionales"
          className="panel-separated"
          action={
            <div className="form-actions">
              {editingProfessional ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingProfessional(false);
                      if (query.data) {
                        setForm({
                          ...query.data,
                          acceptedCoveragesText: query.data.acceptedCoverages.join(", "),
                        });
                      }
                      setServerError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => updateMutation.mutate("professional")} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setEditingProfessional(true)}>
                  Editar
                </Button>
              )}
            </div>
          }
        >
          <div className="minimal-form">
            <Input
              label="Especialidad"
              value={form.specialty}
              disabled={!editingProfessional}
              onChange={(event) =>
                setForm((current) => current ? { ...current, specialty: event.target.value } : current)
              }
            />
            <Input
              label="Matricula"
              value={form.licenseNumber}
              disabled={!editingProfessional}
              onChange={(event) =>
                setForm((current) => current ? { ...current, licenseNumber: event.target.value } : current)
              }
            />
            <Input
              label="Coberturas aceptadas"
              value={form.acceptedCoveragesText}
              disabled={!editingProfessional}
              hint="Separalas con coma"
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, acceptedCoveragesText: event.target.value } : current,
                )
              }
            />
            <Input
              label="Honorarios"
              value={form.fees}
              disabled={!editingProfessional}
              onChange={(event) =>
                setForm((current) => current ? { ...current, fees: event.target.value } : current)
              }
            />
            {serverError ? <span className="field-error">{serverError}</span> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
