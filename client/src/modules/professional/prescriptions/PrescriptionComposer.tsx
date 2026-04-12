import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPrescription } from "@/modules/prescriptions/api/prescriptions.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

const recipeTypeOptions = [
  { value: "medicacion", label: "Medicacion" },
  { value: "estudio", label: "Estudio" },
  { value: "kinesiologia", label: "Kinesiologia" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "internacion", label: "Internacion domiciliaria" },
];

interface PrescriptionComposerProps {
  patientId: string;
  professionalId: string;
  patientName: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function PrescriptionComposer({
  patientId,
  professionalId,
  patientName,
  onCancel,
  onSuccess,
}: PrescriptionComposerProps) {
  const queryClient = useQueryClient();
  const [recipeType, setRecipeType] = useState("medicacion");
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      createPrescription({
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
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.professionalPatientDetail(patientId),
      });
      onSuccess?.();
    },
  });

  return (
    <div className="stack-md">
      <div className="stack-sm">
        <strong>{patientName}</strong>
        <span className="meta">La receta se crea desde esta ficha sin salir de la pagina.</span>
      </div>

      <div className="minimal-form">
        <Select
          label="Tipo de receta"
          options={recipeTypeOptions}
          value={recipeType}
          onChange={(event) => setRecipeType(event.target.value)}
        />
        {recipeType === "medicacion" ? (
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
        ) : (
          <>
            <Input
              label="Indicacion principal"
              placeholder="Ej. Ecografia abdominal"
              value={medication}
              onChange={(event) => setMedication(event.target.value)}
            />
            <Input
              label="Detalle"
              placeholder="Ej. Realizar en ayunas"
              value={dose}
              onChange={(event) => setDose(event.target.value)}
            />
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
            disabled={!medication || !dose || mutation.isPending}
            onClick={() => void mutation.mutateAsync()}
          >
            {mutation.isPending ? "Creando..." : "Crear receta"}
          </Button>
        </div>
        {mutation.isError ? (
          <span className="field-error">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "No se pudo crear la receta."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
