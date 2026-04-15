import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getPatientHealthInfo,
  updatePatientHealthInfo,
} from "@/modules/patient/api/patient.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate } from "@/shared/utils/date";
import type { ApiHealthInfo } from "@/shared/types/api";

interface MedicationFormItem {
  name: string;
  quantity: string;
  frequency: string;
}

interface HealthFormState {
  diseases: string[];
  allergies: string[];
  medications: MedicationFormItem[];
}

const healthSections = [
  { key: "diseases", title: "Enfermedades", emptyLabel: "Sin enfermedades registradas." },
  { key: "allergies", title: "Alergias", emptyLabel: "Sin alergias registradas." },
] as const;

function parseMedication(value: string): MedicationFormItem {
  const match = value.match(/^(.*?)\s+\|\s+Cantidad:\s*(.*?)\s+\|\s+Frecuencia:\s*(.*)$/);

  if (match) {
    return {
      name: match[1]?.trim() ?? "",
      quantity: match[2]?.trim() ?? "",
      frequency: match[3]?.trim() ?? "",
    };
  }

  return {
    name: value,
    quantity: "",
    frequency: "",
  };
}

function formatMedication(value: MedicationFormItem) {
  return `${value.name.trim()} | Cantidad: ${value.quantity.trim()} | Frecuencia: ${value.frequency.trim()}`;
}

function mapHealthToForm(healthInfo: ApiHealthInfo | null | undefined): HealthFormState {
  return {
    diseases: healthInfo?.diseases?.length ? healthInfo.diseases : [""],
    allergies: healthInfo?.allergies?.length ? healthInfo.allergies : [""],
    medications: healthInfo?.medications?.length
      ? healthInfo.medications.map(parseMedication)
      : [{ name: "", quantity: "", frequency: "" }],
  };
}

function sanitizeItems(values: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length ? cleaned : [];
}

function sanitizeMedications(values: MedicationFormItem[]) {
  return values
    .map((value) => ({
      name: value.name.trim(),
      quantity: value.quantity.trim(),
      frequency: value.frequency.trim(),
    }))
    .filter((value) => value.name)
    .map(formatMedication);
}

export function PatientHealthPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<HealthFormState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...queryKeys.patientHealth, patientId],
    queryFn: () => getPatientHealthInfo(patientId),
    enabled: Boolean(patientId),
  });

  const medicationValidationError = useMemo(() => {
    const medications = form?.medications ?? [];
    const hasIncompleteMedication = medications.some((item) => {
      const filledFields = [item.name, item.quantity, item.frequency].filter((value) => value.trim()).length;
      return filledFields > 0 && filledFields < 3;
    });

    return hasIncompleteMedication
      ? "Cada medicamento debe tener nombre, cantidad y frecuencia."
      : null;
  }, [form?.medications]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePatientHealthInfo(patientId, {
        diseases: sanitizeItems(form?.diseases ?? []),
        allergies: sanitizeItems(form?.allergies ?? []),
        medications: sanitizeMedications(form?.medications ?? []),
      }),
    onSuccess: async (nextHealth) => {
      setForm(mapHealthToForm(nextHealth));
      setEditing(false);
      setServerError(null);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientHealth, patientId],
      });
    },
    onError: (error) => {
      setServerError(
        error instanceof Error ? error.message : "No se pudo guardar tu informacion de salud.",
      );
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm(mapHealthToForm(query.data));
    }
  }, [query.data]);

  const updateListValue = (key: "diseases" | "allergies", index: number, value: string) => {
    setForm((current) => {
      if (!current) return current;
      const nextItems = [...current[key]];
      nextItems[index] = value;
      return { ...current, [key]: nextItems };
    });
  };

  const addListValue = (key: "diseases" | "allergies") => {
    setForm((current) => {
      if (!current) return current;
      return { ...current, [key]: [...current[key], ""] };
    });
  };

  const removeListValue = (key: "diseases" | "allergies", index: number) => {
    setForm((current) => {
      if (!current) return current;
      const nextItems = current[key].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [key]: nextItems.length ? nextItems : [""] };
    });
  };

  const updateMedication = (index: number, field: keyof MedicationFormItem, value: string) => {
    setForm((current) => {
      if (!current) return current;

      const nextItems = [...current.medications];
      nextItems[index] = {
        ...nextItems[index],
        [field]: value,
      };

      return { ...current, medications: nextItems };
    });
  };

  const addMedication = () => {
    setForm((current) =>
      current
        ? {
            ...current,
            medications: [...current.medications, { name: "", quantity: "", frequency: "" }],
          }
        : current,
    );
  };

  const removeMedication = (index: number) => {
    setForm((current) => {
      if (!current) return current;

      const nextItems = current.medications.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        medications: nextItems.length ? nextItems : [{ name: "", quantity: "", frequency: "" }],
      };
    });
  };

  if (query.isLoading || !form) return <div className="centered-feedback">Cargando salud...</div>;
  if (query.isError) return <div className="centered-feedback">No pudimos cargar tus datos.</div>;

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Salud</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-main-column">
          {healthSections.map((section) => {
            const items = form[section.key];
            const visibleItems = sanitizeItems(items);

            return (
              <Card
                key={section.key}
                title={section.title}
                className="panel-separated"
                action={
                  editing ? (
                    <Button
                      variant="ghost"
                      className="button-inline"
                      onClick={() => addListValue(section.key)}
                    >
                      Agregar
                    </Button>
                  ) : null
                }
              >
                <div className="stack-md">
                  {editing ? (
                    items.map((item, index) => (
                      <div key={`${section.key}-${index}`} className="row-wrap">
                        <Input
                          value={item}
                          placeholder={`Agregar ${section.title.toLowerCase()}`}
                          onChange={(event) =>
                            updateListValue(section.key, index, event.target.value)
                          }
                        />
                        <Button
                          variant="ghost"
                          className="button-inline"
                          onClick={() => removeListValue(section.key, index)}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))
                  ) : visibleItems.length ? (
                    <div className="plain-list">
                      {visibleItems.map((item) => (
                        <div key={item} className="list-row">
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="meta">{section.emptyLabel}</span>
                  )}
                </div>
              </Card>
            );
          })}

          <Card
            title="Medicacion actual"
            className="panel-separated"
            action={
              editing ? (
                <Button variant="ghost" className="button-inline" onClick={addMedication}>
                  Agregar
                </Button>
              ) : null
            }
          >
            <div className="stack-md">
              {editing ? (
                form.medications.map((item, index) => (
                  <div key={`medication-${index}`} className="schedule-box stack-md">
                    <Input
                      label="Medicamento"
                      value={item.name}
                      placeholder="Ej. Paracetamol"
                      onChange={(event) => updateMedication(index, "name", event.target.value)}
                    />
                    <Input
                      label="Cantidad"
                      value={item.quantity}
                      placeholder="Ej. 1 comprimido"
                      onChange={(event) => updateMedication(index, "quantity", event.target.value)}
                    />
                    <Input
                      label="Frecuencia"
                      value={item.frequency}
                      placeholder="Ej. Cada 8 horas"
                      onChange={(event) => updateMedication(index, "frequency", event.target.value)}
                    />
                    <div className="form-actions">
                      <Button
                        variant="ghost"
                        className="button-inline"
                        onClick={() => removeMedication(index)}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))
              ) : sanitizeMedications(form.medications).length ? (
                <div className="plain-list">
                  {form.medications
                    .filter((item) => item.name.trim())
                    .map((item) => (
                      <div key={formatMedication(item)} className="list-row">
                        <div className="stack-sm">
                          <strong>{item.name}</strong>
                          <span className="meta">Cantidad: {item.quantity}</span>
                          <span className="meta">Frecuencia: {item.frequency}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <span className="meta">Sin medicacion registrada.</span>
              )}
            </div>
          </Card>
        </div>

        <aside className="settings-side-column">
          <Card title="Edicion" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Actualiza enfermedades, alergias y medicacion habitual desde un solo lugar.
              </p>
              {editing ? (
                <>
                  <Button
                    fullWidth
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending || Boolean(medicationValidationError)}
                  >
                    {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setEditing(false);
                      setForm(mapHealthToForm(query.data));
                      setServerError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button fullWidth onClick={() => setEditing(true)}>
                  Editar informacion
                </Button>
              )}
              {medicationValidationError ? (
                <span className="field-error">{medicationValidationError}</span>
              ) : null}
              {serverError ? <span className="field-error">{serverError}</span> : null}
            </div>
          </Card>

          <Card title="Privacidad" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Esta informacion es visible para vos y para los profesionales con acceso autorizado.
              </p>
              <span className="meta">
                Actualizado {query.data ? formatNumericDate(query.data.updatedAt) : "-"}
              </span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
