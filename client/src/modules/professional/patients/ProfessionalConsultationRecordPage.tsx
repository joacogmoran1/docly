import { Card } from "@/shared/ui/Card";

export function ProfessionalConsultationRecordPage() {
  return (
    <div className="page-stack">
      <Card title="Crear registro" className="panel-separated">
        <p className="meta">
          Para crear un registro medico necesitas abrir primero la ficha de un paciente y
          usar la accion "Crear registro" desde esa vista.
        </p>
      </Card>
    </div>
  );
}
