import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPrescription,
  updatePrescription,
} from "@/modules/prescriptions/api/prescriptions.api";
import { studyTypeDefinitions } from "@/shared/constants/medical-options";
import { queryKeys } from "@/shared/constants/query-keys";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import type { ApiPrescriptionMedication } from "@/shared/types/api";

const recipeTypeOptions = [
  { value: "medicacion", label: "Medicacion" },
  { value: "estudio", label: "Estudio" },
  { value: "kinesiologia", label: "Kinesiologia" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "internacion", label: "Internacion domiciliaria" },
];

const imageStudyTypes = [
  "Ecografia",
  "Radiografia",
  "Tomografia computada",
  "Resonancia magnetica",
  "Mamografia",
  "Densitometria",
  "PET-CT",
  "Fondo de ojo",
  "Colposcopia",
];

const laboratoryStudyTypes = [
  "Analisis de sangre",
  "Analisis de orina",
  "Coprocultivo",
  "Biopsia",
  "Papanicolaou",
  "Estudio de fertilidad",
];

const endoscopyStudyTypes = ["Endoscopia", "Colonoscopia"];

const functionalStudyTypes = studyTypeDefinitions
  .map((item) => item.value)
  .filter(
    (item) =>
      !imageStudyTypes.includes(item) &&
      !laboratoryStudyTypes.includes(item) &&
      !endoscopyStudyTypes.includes(item),
  );

const imageStudyOptions = imageStudyTypes.map((value) => ({ value, label: value }));
const laboratoryStudyOptions = laboratoryStudyTypes.map((value) => ({ value, label: value }));
const endoscopyStudyOptions = endoscopyStudyTypes.map((value) => ({ value, label: value }));
const functionalStudyOptions = functionalStudyTypes.map((value) => ({ value, label: value }));

function getStudyMode(recipeType: string) {
  if (recipeType === "laboratorio") return "laboratory";
  if (recipeType === "estudio") return "image";
  return "generic";
}

function getStudySubtypeOptions(recipeType: string) {
  const mode = getStudyMode(recipeType);

  if (mode === "laboratory") {
    return laboratoryStudyOptions;
  }

  if (mode === "image") {
    return [
      ...imageStudyOptions,
      ...functionalStudyOptions,
      ...endoscopyStudyOptions,
      { value: "Otro estudio", label: "Otro estudio" },
    ];
  }

  return [];
}

interface PrescriptionComposerProps {
  patientId: string;
  professionalId?: string;
  patientName: string;
  prescriptionId?: string;
  initialValues?: {
    diagnosis?: string;
    instructions?: string;
    validUntil?: string;
    medications?: ApiPrescriptionMedication[];
  };
  onCancel: () => void;
  onSuccess?: () => void;
}

export function PrescriptionComposer({
  patientId,
  professionalId,
  patientName,
  prescriptionId,
  initialValues,
  onCancel,
  onSuccess,
}: PrescriptionComposerProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(prescriptionId);
  const [recipeType, setRecipeType] = useState("medicacion");
  const [studySubtype, setStudySubtype] = useState("Resonancia magnetica");
  const [diagnosis, setDiagnosis] = useState(initialValues?.diagnosis ?? "");
  const [instructions, setInstructions] = useState(initialValues?.instructions ?? "");
  const [validUntil, setValidUntil] = useState(initialValues?.validUntil ?? "");
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [bodyArea, setBodyArea] = useState("");
  const [clinicalQuestion, setClinicalQuestion] = useState("");
  const [preparation, setPreparation] = useState("");
  const [contrast, setContrast] = useState("");
  const [requestedPanel, setRequestedPanel] = useState("");
  const [sampleNotes, setSampleNotes] = useState("");
  const [sedation, setSedation] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [editMedications, setEditMedications] = useState<ApiPrescriptionMedication[]>(
    initialValues?.medications?.length
      ? initialValues.medications.map((item) => ({
          name: item.name,
          dose: item.dose,
          frequency: item.frequency ?? "",
          duration: item.duration ?? "",
        }))
      : [{ name: "", dose: "", frequency: "", duration: "" }],
  );

  const studySubtypeOptions = useMemo(() => getStudySubtypeOptions(recipeType), [recipeType]);
  const selectedStudyMode = useMemo(() => {
    if (laboratoryStudyTypes.includes(studySubtype)) return "laboratory";
    if (endoscopyStudyTypes.includes(studySubtype)) return "endoscopy";
    if (imageStudyTypes.includes(studySubtype)) return "image";
    if (functionalStudyTypes.includes(studySubtype)) return "functional";
    return "generic";
  }, [studySubtype]);

  const updateEditMedication = (
    index: number,
    field: keyof ApiPrescriptionMedication,
    value: string,
  ) => {
    setEditMedications((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addEditMedication = () => {
    setEditMedications((current) => [
      ...current,
      { name: "", dose: "", frequency: "", duration: "" },
    ]);
  };

  const removeEditMedication = (index: number) => {
    setEditMedications((current) =>
      current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing && prescriptionId) {
        return updatePrescription(prescriptionId, {
          medications: editMedications.map((item) => ({
            name: item.name || "Indicacion",
            dose: item.dose || "Sin dosis",
            frequency: item.frequency || undefined,
            duration: item.duration || undefined,
          })),
          diagnosis: diagnosis || undefined,
          instructions: instructions || undefined,
          validUntil: validUntil || undefined,
        });
      }

      if (!professionalId) {
        throw new Error("No se pudo identificar al profesional.");
      }

      if (recipeType === "medicacion") {
        return createPrescription({
          patientId,
          professionalId,
          medications: [
            {
              name: medication || "Indicacion",
              dose: dose || "Sin dosis",
              frequency: frequency || undefined,
              duration: duration || undefined,
            },
          ],
          diagnosis: diagnosis || undefined,
          instructions: instructions || undefined,
          validUntil: validUntil || undefined,
        });
      }

      if (recipeType === "estudio" || recipeType === "laboratorio") {
        const baseInstructions = [instructions, preparation, followUp].filter(Boolean).join(" | ");

        const medicationPayload =
          selectedStudyMode === "laboratory"
            ? {
                name: studySubtype || "Laboratorio",
                dose: requestedPanel || "Practicas solicitadas",
                frequency: sampleNotes || undefined,
                duration: preparation || undefined,
              }
            : selectedStudyMode === "image"
              ? {
                  name: studySubtype || "Estudio por imagen",
                  dose: bodyArea || "Region a estudiar",
                  frequency: contrast || undefined,
                  duration: preparation || undefined,
                }
              : selectedStudyMode === "endoscopy"
                ? {
                    name: studySubtype || "Procedimiento",
                    dose: bodyArea || "Zona o procedimiento",
                    frequency: sedation || undefined,
                    duration: preparation || undefined,
                  }
                : {
                    name: studySubtype || "Estudio funcional",
                    dose: clinicalQuestion || bodyArea || "Objetivo del estudio",
                    frequency: preparation || undefined,
                    duration: followUp || undefined,
                  };

        return createPrescription({
          patientId,
          professionalId,
          medications: [medicationPayload],
          diagnosis: diagnosis || undefined,
          instructions: baseInstructions || undefined,
          validUntil: validUntil || undefined,
        });
      }

      return createPrescription({
        patientId,
        professionalId,
        medications: [
          {
            name: medication || "Indicacion",
            dose: dose || recipeType,
            frequency: frequency || undefined,
            duration: duration || undefined,
          },
        ],
        diagnosis: diagnosis || undefined,
        instructions: instructions || undefined,
        validUntil: validUntil || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPatientDetail(patientId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalPatientDetail(patientId), "prescription", prescriptionId],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.professionalPrescriptions,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientPrescriptions,
        }),
      ]);
      onSuccess?.();
    },
  });

  const isMedication = recipeType === "medicacion";
  const isStudyRecipe = recipeType === "estudio" || recipeType === "laboratorio";
  const canSubmit = isEditing
    ? editMedications.some((item) => Boolean(item.name.trim() && item.dose.trim()))
    : isMedication
    ? Boolean(medication && dose)
    : isStudyRecipe
      ? Boolean(studySubtype && (selectedStudyMode === "laboratory" ? requestedPanel : bodyArea || clinicalQuestion))
      : Boolean(medication && dose);

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{patientName}</strong>
        <span className="meta">La receta se crea desde esta ficha sin salir de la pagina.</span>
      </div>

      <div className="minimal-form">
        {isEditing ? (
          <>
            {editMedications.map((item, index) => (
              <div key={`edit-medication-${index}`} className="stack-md">
                <Input
                  label={`Medicacion ${index + 1}`}
                  placeholder="Ej. Losartan 50 mg"
                  value={item.name}
                  onChange={(event) => updateEditMedication(index, "name", event.target.value)}
                />
                <Input
                  label="Dosis"
                  placeholder="Ej. 1 comprimido cada 24 hs"
                  value={item.dose}
                  onChange={(event) => updateEditMedication(index, "dose", event.target.value)}
                />
                <Input
                  label="Frecuencia"
                  placeholder="Ej. 1 vez al dia"
                  value={item.frequency ?? ""}
                  onChange={(event) => updateEditMedication(index, "frequency", event.target.value)}
                />
                <Input
                  label="Duracion"
                  placeholder="Ej. 30 dias"
                  value={item.duration ?? ""}
                  onChange={(event) => updateEditMedication(index, "duration", event.target.value)}
                />
                <div className="row-wrap">
                  <Button type="button" variant="ghost" onClick={addEditMedication}>
                    Agregar medicacion
                  </Button>
                  {editMedications.length > 1 ? (
                    <Button type="button" variant="ghost" onClick={() => removeEditMedication(index)}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <Select
              label="Tipo de receta"
              options={recipeTypeOptions}
              value={recipeType}
              onChange={(event) => {
                const nextType = event.target.value;
                setRecipeType(nextType);
                const nextSubtypeOptions = getStudySubtypeOptions(nextType);
                setStudySubtype(nextSubtypeOptions[0]?.value ?? "Otro estudio");
              }}
            />

            {isMedication ? (
              <>
                <Input
                  label="Medicacion"
                  placeholder="Ej. Losartan 50 mg"
                  value={medication}
                  onChange={(event) => setMedication(event.target.value)}
                />
                <Input
                  label="Dosis"
                  placeholder="Ej. 1 comprimido cada 24 hs"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                />
                <Input
                  label="Frecuencia"
                  placeholder="Ej. 1 vez al dia"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                />
                <Input
                  label="Duracion"
                  placeholder="Ej. 30 dias"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </>
            ) : isStudyRecipe ? (
              <>
                <Select
                  label="Tipo de estudio"
                  options={studySubtypeOptions}
                  value={studySubtype}
                  onChange={(event) => setStudySubtype(event.target.value)}
                />

                {selectedStudyMode === "laboratory" ? (
                  <>
                    <Input
                      label="Practicas solicitadas"
                      placeholder="Ej. Hemograma completo, glucemia, perfil lipidico"
                      value={requestedPanel}
                      onChange={(event) => setRequestedPanel(event.target.value)}
                    />
                    <Input
                      label="Preparacion"
                      placeholder="Ej. Ayuno de 8 horas"
                      value={preparation}
                      onChange={(event) => setPreparation(event.target.value)}
                    />
                    <Input
                      label="Muestra u observaciones"
                      placeholder="Ej. Primera orina de la manana"
                      value={sampleNotes}
                      onChange={(event) => setSampleNotes(event.target.value)}
                    />
                  </>
                ) : selectedStudyMode === "image" ? (
                  <>
                    <Input
                      label="Region a estudiar"
                      placeholder="Ej. Columna lumbar"
                      value={bodyArea}
                      onChange={(event) => setBodyArea(event.target.value)}
                    />
                    <Input
                      label="Consulta clinica"
                      placeholder="Ej. Descartar hernia de disco"
                      value={clinicalQuestion}
                      onChange={(event) => setClinicalQuestion(event.target.value)}
                    />
                    <Input
                      label="Contraste"
                      placeholder="Ej. Con contraste / Sin contraste"
                      value={contrast}
                      onChange={(event) => setContrast(event.target.value)}
                    />
                    <Input
                      label="Preparacion"
                      placeholder="Ej. Ayuno de 6 horas"
                      value={preparation}
                      onChange={(event) => setPreparation(event.target.value)}
                    />
                  </>
                ) : selectedStudyMode === "endoscopy" ? (
                  <>
                    <Input
                      label="Procedimiento o zona"
                      placeholder="Ej. Colonoscopia completa"
                      value={bodyArea}
                      onChange={(event) => setBodyArea(event.target.value)}
                    />
                    <Input
                      label="Preparacion"
                      placeholder="Ej. Dieta liquida y laxante previo"
                      value={preparation}
                      onChange={(event) => setPreparation(event.target.value)}
                    />
                    <Input
                      label="Sedacion"
                      placeholder="Ej. Con sedacion"
                      value={sedation}
                      onChange={(event) => setSedation(event.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      label="Objetivo del estudio"
                      placeholder="Ej. Evaluar arritmias"
                      value={clinicalQuestion}
                      onChange={(event) => setClinicalQuestion(event.target.value)}
                    />
                    <Input
                      label="Preparacion"
                      placeholder="Ej. Evitar cafeina 24 horas antes"
                      value={preparation}
                      onChange={(event) => setPreparation(event.target.value)}
                    />
                    <Input
                      label="Seguimiento"
                      placeholder="Ej. Traer resultados a consulta"
                      value={followUp}
                      onChange={(event) => setFollowUp(event.target.value)}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <Input
                  label="Indicacion principal"
                  placeholder="Ej. 10 sesiones de kinesiologia"
                  value={medication}
                  onChange={(event) => setMedication(event.target.value)}
                />
                <Input
                  label="Detalle"
                  placeholder="Ej. 2 veces por semana"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                />
                <Input
                  label="Frecuencia"
                  placeholder="Ej. Segun disponibilidad"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                />
                <Input
                  label="Duracion"
                  placeholder="Ej. 4 semanas"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </>
            )}
          </>
        )}

        <Input
          label="Diagnostico"
          placeholder="Motivo clinico"
          value={diagnosis}
          onChange={(event) => setDiagnosis(event.target.value)}
        />
        <Input
          label="Indicaciones"
          placeholder="Tomar o presentar segun corresponda"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
        <Input
          label="Valida hasta"
          type="date"
          value={validUntil}
          onChange={(event) => setValidUntil(event.target.value)}
        />
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => void mutation.mutateAsync()}
          >
            {mutation.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear receta"}
          </Button>
        </div>
        {mutation.isError ? (
          <span className="field-error">
            {mutation.error instanceof Error
              ? mutation.error.message
              : isEditing
                ? "No se pudo actualizar la receta."
                : "No se pudo crear la receta."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
