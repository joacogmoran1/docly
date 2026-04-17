import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  ConsultationRecordComposer,
} from "@/modules/professional/patients/ConsultationRecordComposer";
import {
  ProfessionalPatientSelector,
  type ProfessionalSelectablePatient,
} from "@/modules/professional/patients/ProfessionalPatientSelector";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export function ProfessionalConsultationRecordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const professionalId = user?.professionalId ?? "";
  const [selectedPatient, setSelectedPatient] = useState<ProfessionalSelectablePatient | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleStartComposing = () => {
    if (!selectedPatient) return;
    setIsComposing(true);
  };

  const handleSuccess = () => {
    if (!selectedPatient) return;

    navigate(`/professional/patients/${selectedPatient.id}?tab=records`, {
      state: selectedPatient.isLinked
        ? undefined
        : {
            feedback: {
              tone: "success",
              message: `Registro guardado y primer vinculo creado con ${selectedPatient.fullName}.`,
            },
          },
    });
  };

  const handleCancel = () => {
    setIsComposing(false);
  };

  return (
    <div className="page-stack">
      <div className="subpage-header">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Volver
        </Button>
      </div>

      {isComposing && selectedPatient ? (
        <Card
          title="Nuevo registro medico"
          description={`Paciente: ${selectedPatient.fullName}`}
          className="panel-separated"
        >
          <ConsultationRecordComposer
            patientId={selectedPatient.id}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </Card>
      ) : (
        <Card
          title="Crear registro medico"
          description="Busca un paciente existente o uno nuevo para registrar la consulta sin depender solo de tu listado actual."
          className="panel-separated"
        >
          <div className="minimal-form">
            <ProfessionalPatientSelector
              professionalId={professionalId}
              value={selectedPatient?.id ?? ""}
              onChange={setSelectedPatient}
              newPatientMessage="Al guardar el registro se creara tambien el primer vinculo con este paciente."
              emptyStateMessage="No encontramos pacientes con ese criterio."
            />

            <div className="form-actions">
              <Button onClick={handleStartComposing} disabled={!selectedPatient}>
                Continuar
              </Button>
            </div>

            {!selectedPatient ? (
              <span className="meta">
                Puedes seguir usando tus pacientes ya vinculados o buscar uno nuevo por nombre, documento o contacto.
              </span>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
