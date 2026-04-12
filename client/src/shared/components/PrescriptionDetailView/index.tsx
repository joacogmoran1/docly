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
    >
      <div className="stack-md">
        <div className="detail-summary-grid">
          <div className="stack-sm">
            <span className="meta">Indicacion principal</span>
            <strong>{prescription.dose}</strong>
          </div>
          <div className="stack-sm">
            <span className="meta">Fecha</span>
            <strong>{formatNumericDate(prescription.date)}</strong>
          </div>
          {prescription.validUntil ? (
            <div className="stack-sm">
              <span className="meta">Valida hasta</span>
              <strong>{formatNumericDate(prescription.validUntil)}</strong>
            </div>
          ) : null}
        </div>
        {prescription.diagnosis ? (
          <div className="stack-sm">
            <span className="meta">Diagnostico</span>
            <p className="meta">{prescription.diagnosis}</p>
          </div>
        ) : null}
        {prescription.instructions ? (
          <div className="stack-sm">
            <span className="meta">Indicaciones</span>
            <p className="meta">{prescription.instructions}</p>
          </div>
        ) : null}
        {prescription.medications?.length ? (
          <div className="stack-sm">
            <span className="meta">Medicacion indicada</span>
            <div className="plain-list">
              {prescription.medications.map((medication) => (
                <div key={`${prescription.id}-${medication.name}`} className="list-row">
                  <div className="stack-sm">
                    <strong>{medication.name}</strong>
                    <span className="meta">
                      {[medication.dose, medication.frequency, medication.duration]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
