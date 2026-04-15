import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProfessionalSignature,
  getProfessionalSignature,
  getProfessionalProfile,
  uploadProfessionalSignature,
  updateProfessionalProfile,
} from "@/modules/professional/api/professional.api";
import { SignaturePad } from "@/modules/professional/profile/SignaturePad";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  isKnownArgentinaCoverage,
  professionalCoverageOptions,
} from "@/shared/constants/medical-options";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import type { ProfessionalProfileView } from "@/services/api/mappers";

interface ProfessionalProfileForm extends ProfessionalProfileView {
  selectedCoverage: string;
  customCoverage: string;
}

function normalizeAcceptedCoverages(values: string[]) {
  const cleaned = values.map((item) => item.trim()).filter(Boolean);

  if (!cleaned.length) {
    return [];
  }

  if (cleaned.includes("No posee")) {
    return ["No posee"];
  }

  return Array.from(new Set(cleaned)).sort((left, right) => left.localeCompare(right));
}

function mapProfileToForm(profile: ProfessionalProfileView): ProfessionalProfileForm {
  return {
    ...profile,
    acceptedCoverages: normalizeAcceptedCoverages(profile.acceptedCoverages),
    selectedCoverage: "",
    customCoverage: "",
  };
}

export function ProfessionalProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const [editing, setEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signaturePadVersion, setSignaturePadVersion] = useState(0);
  const [form, setForm] = useState<ProfessionalProfileForm | null>(null);
  const query = useQuery({
    queryKey: [...queryKeys.professionalProfile, professionalId],
    queryFn: () => getProfessionalProfile(professionalId),
    enabled: Boolean(professionalId),
  });
  const signatureQuery = useQuery({
    queryKey: [...queryKeys.professionalProfile, professionalId, "signature"],
    queryFn: () => getProfessionalSignature(professionalId),
    enabled: Boolean(professionalId),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!form) {
        throw new Error("No hay datos para guardar.");
      }

      return updateProfessionalProfile(professionalId, {
        name: form.name || undefined,
        lastName: form.lastName || undefined,
        phone: form.phone || undefined,
        specialty: form.specialty || undefined,
        licenseNumber: form.licenseNumber || undefined,
        acceptedCoverages: normalizeAcceptedCoverages(form.acceptedCoverages),
        fees: form.fees ? Number(form.fees) : undefined,
      });
    },
    onSuccess: async (nextProfile) => {
      setForm(mapProfileToForm(nextProfile));
      setEditing(false);
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
  const uploadSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signaturePreview) {
        throw new Error("Firma en pantalla antes de guardar.");
      }

      return uploadProfessionalSignature(professionalId, signaturePreview);
    },
    onSuccess: async () => {
      setSignaturePreview(null);
      setSignaturePadVersion((current) => current + 1);
      setSignatureError(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalProfile, professionalId, "signature"],
      });
    },
    onError: (error) => {
      setSignatureError(
        error instanceof Error ? error.message : "No se pudo guardar la firma digital.",
      );
    },
  });
  const deleteSignatureMutation = useMutation({
    mutationFn: () => deleteProfessionalSignature(professionalId),
    onSuccess: async () => {
      setSignaturePreview(null);
      setSignaturePadVersion((current) => current + 1);
      setSignatureError(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalProfile, professionalId, "signature"],
      });
    },
    onError: (error) => {
      setSignatureError(
        error instanceof Error ? error.message : "No se pudo eliminar la firma digital.",
      );
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm(mapProfileToForm(query.data));
    }
  }, [query.data]);

  const addCoverage = () => {
    if (!form) return;

    const nextValue =
      form.selectedCoverage === "__OTHER__" ? form.customCoverage.trim() : form.selectedCoverage;

    if (!nextValue) {
      return;
    }

    setForm((current) => {
      if (!current) return current;

      const nextCoverages =
        nextValue === "No posee"
          ? ["No posee"]
          : normalizeAcceptedCoverages([
              ...current.acceptedCoverages.filter((item) => item !== "No posee"),
              nextValue,
            ]);

      return {
        ...current,
        acceptedCoverages: nextCoverages,
        selectedCoverage: "",
        customCoverage: "",
      };
    });
  };

  const removeCoverage = (value: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            acceptedCoverages: current.acceptedCoverages.filter((item) => item !== value),
          }
        : current,
    );
  };

  const displayedSignature = signaturePreview || signatureQuery.data?.signature || null;
  const hasStoredSignature = Boolean(signatureQuery.data?.hasSignature);

  if (query.isLoading || !form) return <div className="centered-feedback">Cargando perfil...</div>;
  if (query.isError) return <div className="centered-feedback">No pudimos cargar el perfil.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Perfil</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-main-column">
          <Card title="Datos profesionales" className="panel-separated">
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
                label="Telefono"
                value={form.phone}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, phone: event.target.value } : current))
                }
              />
              <Input
                label="Especialidad"
                value={form.specialty}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, specialty: event.target.value } : current,
                  )
                }
              />
              <Input
                label="Matricula"
                value={form.licenseNumber}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, licenseNumber: event.target.value } : current,
                  )
                }
              />
              <div className="form-field">
                <span className="field-label">Obras sociales</span>
                {editing ? (
                  <div className="stack-md">
                    <div className="row-wrap">
                      <Select
                        options={professionalCoverageOptions}
                        value={form.selectedCoverage}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, selectedCoverage: event.target.value }
                              : current,
                          )
                        }
                      />
                      {form.selectedCoverage === "__OTHER__" ? (
                        <Input
                          placeholder="Ingresar obra social"
                          value={form.customCoverage}
                          onChange={(event) =>
                            setForm((current) =>
                              current
                                ? { ...current, customCoverage: event.target.value }
                                : current,
                            )
                          }
                        />
                      ) : null}
                      <Button type="button" variant="ghost" className="button-inline" onClick={addCoverage}>
                        Agregar
                      </Button>
                    </div>
                    <div className="plain-list">
                      {form.acceptedCoverages.length ? (
                        form.acceptedCoverages.map((coverage) => (
                          <div key={coverage} className="list-row">
                            <span>{coverage}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              className="button-inline"
                              onClick={() => removeCoverage(coverage)}
                            >
                              Quitar
                            </Button>
                          </div>
                        ))
                      ) : (
                        <span className="meta">Todavia no agregaste obras sociales.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="plain-list">
                    {(form.acceptedCoverages.length ? form.acceptedCoverages : ["No posee"]).map(
                      (coverage) => (
                        <div key={coverage} className="list-row">
                          <span>
                            {isKnownArgentinaCoverage(coverage) ? coverage : `${coverage} (otro)`}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              <Input
                label="Honorarios"
                value={form.fees}
                disabled={!editing}
                onChange={(event) =>
                  setForm((current) => (current ? { ...current, fees: event.target.value } : current))
                }
              />
            </div>
          </Card>

          <Card title="Firma digital" className="panel-separated">
            <div className="stack-md">
              <p className="meta">
                Firma directamente en pantalla. La firma se guardara como PNG y se usara
                automaticamente al emitir recetas.
              </p>

              <div className="form-field">
                <span className="field-label">Firma en pantalla</span>
                <SignaturePad
                  resetKey={signaturePadVersion}
                  disabled={uploadSignatureMutation.isPending}
                  onChange={(nextSignature) => {
                    setSignaturePreview(nextSignature);
                    setSignatureError(null);
                  }}
                />
              </div>

              <div className="stack-sm">
                <span className="field-label">
                  {signaturePreview ? "Firma lista para guardar" : "Firma actual"}
                </span>
                {signatureQuery.isLoading && !signaturePreview ? (
                  <span className="meta">Cargando firma...</span>
                ) : displayedSignature ? (
                  <img
                    src={displayedSignature}
                    alt="Firma digital del profesional"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "180px",
                      objectFit: "contain",
                      borderRadius: "12px",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      padding: "12px",
                      background: "#fff",
                    }}
                  />
                ) : (
                  <span className="meta">Todavia no cargaste una firma digital.</span>
                )}
                {signaturePreview ? (
                  <span className="helper-text">
                    Al guardar, esta firma reemplazara la que tengas cargada.
                  </span>
                ) : hasStoredSignature ? (
                  <span className="helper-text">Ya hay una firma cargada en tu perfil.</span>
                ) : null}
              </div>

              <div className="row-wrap">
                <Button
                  type="button"
                  onClick={() => uploadSignatureMutation.mutate()}
                  disabled={!signaturePreview || uploadSignatureMutation.isPending}
                >
                  {uploadSignatureMutation.isPending
                    ? "Guardando firma..."
                    : hasStoredSignature
                      ? "Reemplazar firma"
                      : "Guardar firma"}
                </Button>
                {signaturePreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSignaturePreview(null);
                      setSignaturePadVersion((current) => current + 1);
                      setSignatureError(null);
                    }}
                  >
                    Descartar firma
                  </Button>
                ) : null}
                {hasStoredSignature ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => deleteSignatureMutation.mutate()}
                    disabled={deleteSignatureMutation.isPending}
                  >
                    {deleteSignatureMutation.isPending ? "Eliminando..." : "Eliminar firma"}
                  </Button>
                ) : null}
              </div>

              {signatureQuery.isError ? (
                <span className="field-error">No se pudo cargar la firma digital.</span>
              ) : null}
              {signatureError ? <span className="field-error">{signatureError}</span> : null}
            </div>
          </Card>
        </div>

        <aside className="settings-side-column">
          <Card title="Edicion" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Actualiza desde aca tus datos personales y la informacion profesional visible para pacientes.
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
                        setForm(mapProfileToForm(query.data));
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
                Revisa especialidad, matricula, obras sociales aceptadas y honorarios antes de compartir tu agenda.
              </p>
              <span className="meta">{form.fullName || user?.fullName || "Profesional"}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
