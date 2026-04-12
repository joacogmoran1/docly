import { useState } from "react";
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
  patientName: string;
  onCancel: () => void;
}

function PrescriptionFields({ recipeType }: { recipeType: string }) {
  if (recipeType === "medicacion") {
    return (
      <>
        <Input label="Medicacion" placeholder="Ej. Losartan 50 mg" />
        <Input label="Dosis" placeholder="Ej. 1 comprimido cada 24 hs" />
        <Input label="Duracion" placeholder="Ej. 30 dias" />
      </>
    );
  }

  if (recipeType === "estudio" || recipeType === "laboratorio") {
    return (
      <>
        <Input label="Prestacion" placeholder="Ej. Ecografia abdominal" />
        <Input label="Indicacion" placeholder="Motivo o detalle del pedido" />
      </>
    );
  }

  if (recipeType === "kinesiologia") {
    return (
      <>
        <Input label="Tipo de sesion" placeholder="Ej. Rehabilitacion lumbar" />
        <Input label="Cantidad de sesiones" placeholder="Ej. 10" />
      </>
    );
  }

  return (
    <>
      <Input label="Servicio" placeholder="Ej. Cuidados domiciliarios" />
      <Input label="Frecuencia" placeholder="Ej. 2 veces por semana" />
    </>
  );
}

export function PrescriptionComposer({
  patientName,
  onCancel,
}: PrescriptionComposerProps) {
  const [recipeType, setRecipeType] = useState("medicacion");

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
        <PrescriptionFields recipeType={recipeType} />
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button">Crear receta</Button>
        </div>
      </div>
    </div>
  );
}
