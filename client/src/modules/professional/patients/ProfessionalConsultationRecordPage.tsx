import { useNavigate } from "react-router-dom";
import { ConsultationRecordComposer } from "@/modules/professional/patients/ConsultationRecordComposer";
import { Card } from "@/shared/ui/Card";

export function ProfessionalConsultationRecordPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <Card title="Crear registro" className="panel-separated">
        <ConsultationRecordComposer onCancel={() => navigate(-1)} />
      </Card>
    </div>
  );
}
