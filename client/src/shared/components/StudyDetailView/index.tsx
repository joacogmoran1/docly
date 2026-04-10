import type { StudyItem } from "@/shared/types/domain";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

interface StudyDetailViewProps {
  study: StudyItem;
}

export function StudyDetailView({ study }: StudyDetailViewProps) {
  return (
    <>
      <Card title={study.title} description={study.category} className="panel-separated">
        <div className="detail-summary-grid">
          <div className="stack-sm">
            <span className="meta">Solicitado por</span>
            <strong>{study.requestedBy}</strong>
          </div>
          <div className="stack-sm">
            <span className="meta">Fecha</span>
            <strong>{formatNumericDate(study.date)}</strong>
          </div>
        </div>
      </Card>

      {study.images.length ? (
        <Card title="Imagenes" className="panel-separated">
          <div className="plain-list">
            {study.images.map((image) => (
              <div key={image} className="list-row">
                <span>{image}</span>
                <Button variant="ghost">Abrir</Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title={study.images.length ? "Informe" : "Resultados"} className="panel-separated">
        <p className="meta">{study.reportSummary}</p>
      </Card>
    </>
  );
}
