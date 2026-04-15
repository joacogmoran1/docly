import type { StudyItem } from "@/shared/types/domain";
import { Card } from "@/shared/ui/Card";
import { formatNumericDate } from "@/shared/utils/date";

interface StudyDetailViewProps {
  study: StudyItem;
}

export function StudyDetailView({ study }: StudyDetailViewProps) {
  const attachmentUrls = study.attachmentUrls ?? study.images;
  const isImageStudy = study.attachmentKind === "image";

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

      <Card title="Informe" className="panel-separated">
        <div className="stack-md">
          {study.reportUrl ? (
            <div className="list-row">
              <span>Informe en PDF</span>
              <a href={study.reportUrl} target="_blank" rel="noreferrer" className="helper-text">
                Abrir PDF
              </a>
            </div>
          ) : (
            <p className="meta">Todavia no hay un informe cargado.</p>
          )}
        </div>
      </Card>

      {attachmentUrls.length ? (
        <Card title={isImageStudy ? "Imagenes" : "Resultados"} className="panel-separated">
          <div className="plain-list">
            {attachmentUrls.map((attachment) => (
              <div key={attachment} className="list-row">
                <span>
                  {attachment.startsWith("data:")
                    ? isImageStudy
                      ? "Imagen del estudio"
                      : "Resultados en PDF"
                    : attachment}
                </span>
                <a href={attachment} target="_blank" rel="noreferrer" className="helper-text">
                  {isImageStudy ? "Abrir imagen" : "Abrir PDF"}
                </a>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
