import type { PrescriptionItem } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

interface PrescriptionDetailViewProps {
  prescription: PrescriptionItem;
}

export function PrescriptionDetailView({
  prescription,
}: PrescriptionDetailViewProps) {
  return (
    <Card
      title={prescription.medication}
      description={prescription.professionalName}
      className="panel-separated"
      action={<Button>Descargar</Button>}
    >
      <div className="detail-summary-grid">
        <div className="stack-sm">
          <span className="meta">Indicacion</span>
          <strong>{prescription.dose}</strong>
        </div>
        <div className="stack-sm">
          <span className="meta">Fecha</span>
          <strong>{formatNumericDate(prescription.date)}</strong>
        </div>
      </div>
    </Card>
  );
}
