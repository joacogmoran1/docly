import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfessionalPrescriptionsMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
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

export function ProfessionalPrescriptionsPage() {
  const [recipeType, setRecipeType] = useState("medicacion");
  const query = useQuery({
    queryKey: queryKeys.professionalPrescriptions,
    queryFn: getProfessionalPrescriptionsMock,
  });

  const patientOptions = (query.data?.patients ?? []).map((patient) => ({
    value: patient.id,
    label: patient.fullName,
  }));

  if (query.isLoading) return <div className="centered-feedback">Cargando recetas...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar recetas.</div>;

  return (
    <div className="page-stack">
      <Card title="Nueva receta" className="panel-separated">
        <div className="minimal-form">
          <Select label="Paciente" options={patientOptions} defaultValue={patientOptions[0]?.value} />
          <Select
            label="Tipo de receta"
            options={recipeTypeOptions}
            value={recipeType}
            onChange={(event) => setRecipeType(event.target.value)}
          />
          {recipeType === "medicacion" ? (
            <>
              <Input label="Medicacion" placeholder="Ej. Losartan 50 mg" />
              <Input label="Dosis" placeholder="Ej. 1 comprimido cada 24 hs" />
              <Input label="Duracion" placeholder="Ej. 30 dias" />
            </>
          ) : null}
          {recipeType === "estudio" || recipeType === "laboratorio" ? (
            <>
              <Input label="Prestacion" placeholder="Ej. Ecografia abdominal" />
              <Input label="Indicacion" placeholder="Motivo o detalle del pedido" />
            </>
          ) : null}
          {recipeType === "kinesiologia" ? (
            <>
              <Input label="Tipo de sesion" placeholder="Ej. Rehabilitacion lumbar" />
              <Input label="Cantidad de sesiones" placeholder="Ej. 10" />
            </>
          ) : null}
          {recipeType === "internacion" ? (
            <>
              <Input label="Servicio" placeholder="Ej. Cuidados domiciliarios" />
              <Input label="Frecuencia" placeholder="Ej. 2 veces por semana" />
            </>
          ) : null}
          <Button>Crear receta</Button>
        </div>
      </Card>
    </div>
  );
}
