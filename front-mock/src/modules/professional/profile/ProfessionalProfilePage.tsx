import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfessionalProfileMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { validatePdfUpload } from "@/shared/utils/file-security";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

const professionOptions = [
  { value: "medico", label: "Medico" },
  { value: "kinesiologo", label: "Kinesiologo" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "psicologo", label: "Psicologo" },
  { value: "other", label: "Otro" },
];

const specializationMap: Record<string, { value: string; label: string }[]> = {
  medico: [
    { value: "clinica medica", label: "Clinica medica" },
    { value: "cardiologia", label: "Cardiologia" },
    { value: "traumatologia", label: "Traumatologia" },
    { value: "other", label: "Otra" },
  ],
  kinesiologo: [
    { value: "deportiva", label: "Deportiva" },
    { value: "neurologica", label: "Neurologica" },
    { value: "respiratoria", label: "Respiratoria" },
    { value: "other", label: "Otra" },
  ],
  nutricionista: [
    { value: "clinica", label: "Clinica" },
    { value: "deportiva", label: "Deportiva" },
    { value: "other", label: "Otra" },
  ],
  psicologo: [
    { value: "clinica", label: "Clinica" },
    { value: "infanto juvenil", label: "Infanto juvenil" },
    { value: "other", label: "Otra" },
  ],
  other: [{ value: "other", label: "Otra" }],
};

export function ProfessionalProfilePage() {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [profession, setProfession] = useState("medico");
  const [specialization, setSpecialization] = useState("clinica medica");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureLabel, setSignatureLabel] = useState<string>("");
  const query = useQuery({
    queryKey: queryKeys.professionalProfile,
    queryFn: getProfessionalProfileMock,
  });

  const specializationOptions = useMemo(
    () => specializationMap[profession] ?? specializationMap.other,
    [profession],
  );

  if (query.isLoading) return <div className="centered-feedback">Cargando perfil...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar el perfil.</div>;

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
                  <Button variant="ghost" onClick={() => setEditingPersonal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setEditingPersonal(false)}>Guardar</Button>
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
            <Input label="Nombre" defaultValue={query.data.personal.fullName} disabled={!editingPersonal} />
            <Input label="Telefono" defaultValue={query.data.personal.phone} disabled={!editingPersonal} />
            <Input label="Documento" defaultValue={query.data.personal.document} disabled={!editingPersonal} />
          </div>
        </Card>

        <Card
          title="Datos profesionales"
          className="panel-separated"
          action={
            <div className="form-actions">
              {editingProfessional ? (
                <>
                  <Button variant="ghost" onClick={() => setEditingProfessional(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setEditingProfessional(false)}>Guardar</Button>
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
            <Select
              label="Profesion"
              options={professionOptions}
              value={profession}
              onChange={(event) => setProfession(event.target.value)}
              disabled={!editingProfessional}
            />
            {profession === "other" ? (
              <Input label="Otra profesion" disabled={!editingProfessional} />
            ) : null}

            <Select
              label="Especializacion"
              options={specializationOptions}
              value={specialization}
              onChange={(event) => setSpecialization(event.target.value)}
              disabled={!editingProfessional}
            />
            {specialization === "other" ? (
              <Input label="Otra especializacion" disabled={!editingProfessional} />
            ) : null}

            <Input label="Matricula" defaultValue={query.data.professional.license} disabled={!editingProfessional} />

            <label className="form-field">
              <span className="field-label">Firma digital (PDF)</span>
              <input
                className="input-base"
                type="file"
                accept=".pdf,application/pdf"
                disabled={!editingProfessional}
                onChange={(event) => {
                  const nextFile = event.currentTarget.files?.[0];
                  const validationError = validatePdfUpload(nextFile);

                  if (validationError) {
                    setSignatureError(validationError);
                    setSignatureLabel("");
                    event.currentTarget.value = "";
                    return;
                  }

                  setSignatureError(null);
                  setSignatureLabel(nextFile?.name ?? "");
                }}
              />
              {signatureError ? <span className="field-error">{signatureError}</span> : null}
              {!signatureError && signatureLabel ? (
                <span className="helper-text">{signatureLabel}</span>
              ) : null}
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
