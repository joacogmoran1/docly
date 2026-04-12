import { Card } from "@/shared/ui/Card";
import { formatDateTime } from "@/shared/utils/date";

interface RecordDetailViewProps {
  title: string;
  timestamp: string;
  body: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

export function RecordDetailView({
  title,
  timestamp,
  body,
  diagnosis,
  treatment,
  notes,
  vitalSigns,
}: RecordDetailViewProps) {
  return (
    <Card title={title} description={formatDateTime(timestamp)} className="panel-separated">
      <div className="stack-md">
        {diagnosis ? (
          <div className="stack-sm">
            <span className="meta">Diagnostico</span>
            <strong>{diagnosis}</strong>
          </div>
        ) : null}
        {treatment ? (
          <div className="stack-sm">
            <span className="meta">Tratamiento</span>
            <p className="meta">{treatment}</p>
          </div>
        ) : null}
        {notes ? (
          <div className="stack-sm">
            <span className="meta">Notas</span>
            <p className="meta">{notes}</p>
          </div>
        ) : null}
        {vitalSigns &&
        Object.values(vitalSigns).some((value) => value !== undefined && value !== "") ? (
          <div className="stack-sm">
            <span className="meta">Signos vitales</span>
            <div className="plain-list">
              {vitalSigns.bloodPressure ? <span className="meta">Presion: {vitalSigns.bloodPressure}</span> : null}
              {vitalSigns.heartRate ? <span className="meta">Frecuencia cardiaca: {vitalSigns.heartRate}</span> : null}
              {vitalSigns.temperature ? <span className="meta">Temperatura: {vitalSigns.temperature} C</span> : null}
              {vitalSigns.weight ? <span className="meta">Peso: {vitalSigns.weight} kg</span> : null}
              {vitalSigns.height ? <span className="meta">Altura: {vitalSigns.height} cm</span> : null}
            </div>
          </div>
        ) : null}
        {!diagnosis && !treatment && !notes ? <p className="meta">{body}</p> : null}
      </div>
    </Card>
  );
}
