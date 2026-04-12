import type { StudyItem } from "@/shared/types/domain";
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
                <a href={image} target="_blank" rel="noreferrer" className="helper-text">
                  Abrir archivo
                </a>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title={study.images.length ? "Informe" : "Resultados"} className="panel-separated">
        <div className="stack-md">
          <p className="meta">{study.reportSummary}</p>
          {study.notes ? (
            <div className="stack-sm">
              <span className="meta">Notas</span>
              <p className="meta">{study.notes}</p>
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
