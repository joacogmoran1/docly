import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalPatientDetail } from "@/modules/professional/api/professional.api";
import { ConsultationRecordComposer } from "@/modules/professional/patients/ConsultationRecordComposer";
import { PrescriptionComposer } from "@/modules/professional/prescriptions/PrescriptionComposer";
import { mapApiAppointmentStatus, toDateTimeIso } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { formatNumericDate, formatNumericTime } from "@/shared/utils/date";

export function ProfessionalPatientDetailPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { patientId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "profile");
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [isCreatingPrescription, setIsCreatingPrescription] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const professionalId = user?.professionalId ?? "";

  useEffect(() => {
    const nextFeedback = (location.state as { feedback?: { tone: "success" | "error"; message: string } } | null)?.feedback;
    if (!nextFeedback) {
      return;
    }

    setFeedback(nextFeedback);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  const query = useQuery({
    queryKey: [...queryKeys.professionalPatientDetail(patientId), professionalId],
    queryFn: () => getProfessionalPatientDetail(professionalId, patientId),
    enabled: Boolean(patientId && professionalId),
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando ficha...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la ficha.</div>;

  const handleTabChange = (value: string) => {
    setTab(value);
    setIsCreatingRecord(false);
    setIsCreatingPrescription(false);
    setSearchParams(value === "profile" ? {} : { tab: value }, { replace: true });
  };

  const handleBack = () => {
    if (tab === "records" && isCreatingRecord) {
      setIsCreatingRecord(false);
      return;
    }

    if (tab === "prescriptions" && isCreatingPrescription) {
      setIsCreatingPrescription(false);
      return;
    }

    navigate(-1);
  };

  const tabs = [
    {
      value: "profile",
      label: "Perfil",
      content: (
        <div className="cards-grid">
          <Card title="Datos personales" className="panel-separated">
            <div className="plain-list">
              <div className="list-row"><span className="meta">Nombre</span><strong>{query.data.profile.fullName}</strong></div>
              <div className="list-row"><span className="meta">Nacimiento</span><strong>{query.data.profile.birthDate || "Sin fecha cargada"}</strong></div>
              <div className="list-row"><span className="meta">Email</span><strong>{query.data.profile.email}</strong></div>
              <div className="list-row"><span className="meta">Telefono</span><strong>{query.data.profile.phone || "Sin telefono"}</strong></div>
              <div className="list-row"><span className="meta">Cobertura</span><strong>{query.data.profile.coverage || "Sin cobertura"}</strong></div>
              <div className="list-row"><span className="meta">Numero de cobertura</span><strong>{query.data.profile.coverageNumber || "Sin numero"}</strong></div>
            </div>
          </Card>

          <Card title="Datos de salud" className="panel-separated">
            <div className="plain-list">
              {query.data.health.map((section) => (
                <div key={section.id} className="list-row">
                  <div className="stack-sm">
                    <strong>{section.title}</strong>
                    <span className="meta">{section.items.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ),
    },
    {
      value: "records",
      label: "Registros",
      content: (
        <div className="page-stack">
          {isCreatingRecord ? (
            <Card title="Crear registro" className="panel-separated">
              <ConsultationRecordComposer
                patientId={patientId}
                onCancel={() => setIsCreatingRecord(false)}
                onSuccess={() => setIsCreatingRecord(false)}
              />
            </Card>
          ) : (
            <Card
              title="Resumen de registros"
              className="panel-separated"
              action={
                <Button onClick={() => setIsCreatingRecord(true)}>
                  Crear registro
                </Button>
              }
            >
              <div className="plain-list">
                {query.data.records.map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.title}</strong>
                      <span className="meta">{item.summary}</span>
                    </div>
                    <Link to={`/professional/patients/${patientId}/records/${item.id}`}>
                      <Button variant="ghost">Ver registro</Button>
                    </Link>
                  </div>
                ))}
                {!query.data.records.length ? <span className="meta">Todavia no hay registros.</span> : null}
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      value: "appointments",
      label: "Turnos",
      content: (
        <Card title="Historial de turnos" className="panel-separated">
          <div className="plain-list">
            {query.data.appointments.map((appointment) => {
              const dateTime = toDateTimeIso(appointment.date, appointment.time);

              return (
                <div key={appointment.id} className="list-row">
                  <div className="stack-sm">
                    <strong>
                      {formatNumericDate(dateTime)} a las {formatNumericTime(dateTime)}
                    </strong>
                    <span className="meta">{appointment.office?.name ?? "Consultorio"}</span>
                    <span className="meta">{appointment.reason ?? "Consulta"}</span>
                    <span className="meta">Estado: {mapApiAppointmentStatus(appointment.status)}</span>
                    {appointment.cancellationReason ? (
                      <span className="meta">Motivo de cancelacion: {appointment.cancellationReason}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!query.data.appointments.length ? (
              <span className="meta">Todavia no hay turnos registrados con este paciente.</span>
            ) : null}
          </div>
        </Card>
      ),
    },
    {
      value: "studies",
      label: "Estudios",
      content: (
        <Card title="Resumen de estudios" className="panel-separated">
          <div className="plain-list">
            {query.data.studies.map((study) => (
              <div key={study.id} className="list-row">
                <div className="stack-sm">
                  <strong>{study.title}</strong>
                  <span className="meta">{study.reportSummary}</span>
                </div>
                <Link to={`/professional/patients/${patientId}/studies/${study.id}`}>
                  <Button variant="ghost">Abrir estudio</Button>
                </Link>
              </div>
            ))}
            {!query.data.studies.length ? <span className="meta">Todavia no hay estudios.</span> : null}
          </div>
        </Card>
      ),
    },
    {
      value: "prescriptions",
      label: "Recetas",
      content: (
        <div className="page-stack">
          {isCreatingPrescription ? (
            <Card title="Crear receta" className="panel-separated">
              <PrescriptionComposer
                patientId={patientId}
                professionalId={professionalId}
                patientName={query.data.profile.fullName}
                onCancel={() => setIsCreatingPrescription(false)}
                onSuccess={() => setIsCreatingPrescription(false)}
              />
            </Card>
          ) : (
            <Card
              title="Resumen de recetas"
              className="panel-separated"
              action={
                <Button onClick={() => setIsCreatingPrescription(true)}>
                  Crear receta
                </Button>
              }
            >
              <div className="plain-list">
                {query.data.prescriptions.map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{item.medication}</strong>
                      <span className="meta">{item.dose}</span>
                    </div>
                    <Link to={`/professional/patients/${patientId}/prescriptions/${item.id}`}>
                      <Button variant="ghost">Ver receta</Button>
                    </Link>
                  </div>
                ))}
                {!query.data.prescriptions.length ? <span className="meta">Todavia no hay recetas.</span> : null}
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];
  const currentTab = tabs.find((item) => item.value === tab);

  return (
    <div className="page-stack">
      {feedback ? (
        <div className={`feedback-banner${feedback.tone === "error" ? " is-error" : " is-success"}`}>
          <span>{feedback.message}</span>
          <Button variant="ghost" className="button-inline" onClick={() => setFeedback(null)}>
            Cerrar
          </Button>
        </div>
      ) : null}
      <div className="subpage-header subpage-header-reverse">
        <div className="tabs-list">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`tabs-trigger${tab === item.value ? " active" : ""}`}
              onClick={() => handleTabChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft size={16} />
          Volver
        </Button>
      </div>
      {currentTab?.content}
    </div>
  );
}
