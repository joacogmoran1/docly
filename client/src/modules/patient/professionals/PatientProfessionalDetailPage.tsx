import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPatientProfessionalDetail } from "@/modules/patient/api/patient.api";
import { buildAgendaFromSchedules } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { Select } from "@/shared/ui/Select";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PatientProfessionalDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { professionalId = "" } = useParams();
  const today = getToday();
  const initialMonth = new Date();
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [tab, setTab] = useState("agenda");
  const patientId = user?.patientId;
  const query = useQuery({
    queryKey: [...queryKeys.patientProfessionalDetail(professionalId), displayMonth.getFullYear(), displayMonth.getMonth()],
    queryFn: () =>
      getPatientProfessionalDetail(
        professionalId,
        displayMonth.getFullYear(),
        displayMonth.getMonth(),
        patientId,
      ),
    enabled: Boolean(professionalId),
  });

  const agenda = useMemo(() => {
    if (!query.data) return [];
    return buildAgendaFromSchedules(
      query.data.professional.offices ?? [],
      query.data.appointments,
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
  }, [displayMonth, query.data]);

  const officeFilter = officeId === "all" ? undefined : officeId;
  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeFilter),
    [agenda, officeFilter, selectedDate],
  );

  if (query.isLoading) return <div className="centered-feedback">Cargando profesional...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar este perfil.</div>;

  const { professional } = query.data;
  const tabs = [
    {
      value: "agenda",
      label: "Agenda",
      content: (
        <div className="viewport-section">
          <div className="calendar-layout calendar-layout-viewport">
            <section className="panel panel-separated">
              <MonthCalendar
                agenda={agenda}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                officeId={officeFilter}
                year={displayMonth.getFullYear()}
                month={displayMonth.getMonth()}
                centerContent={
                  <div className="calendar-office-select">
                    <Select
                      options={[
                        { value: "all", label: "Todos los consultorios" },
                        ...(professional.offices ?? []).map((office) => ({
                          value: office.id,
                          label: office.name,
                        })),
                      ]}
                      value={officeId}
                      onChange={(event) => setOfficeId(event.target.value)}
                    />
                  </div>
                }
                onPreviousMonth={() =>
                  setDisplayMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                  )
                }
                onNextMonth={() =>
                  setDisplayMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                  )
                }
                onGoToday={() => {
                  const now = new Date();
                  setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(today);
                }}
                canGoPrevious
              />
            </section>
            <AgendaDayPanel
              title="Turnos del dia"
              dateLabel={formatNumericDate(selectedDate)}
              items={dayItems}
              mode="patient"
            />
          </div>
        </div>
      ),
    },
    {
      value: "records",
      label: "Registros",
      content: (
        <Card title="Registros" className="panel-separated">
          <div className="plain-list">
            {query.data.records.map((item) => (
              <div key={item.id} className="list-row">
                <div className="stack-sm">
                  <strong>{item.title}</strong>
                  <span className="meta">{item.summary}</span>
                </div>
                <Link to={`/patient/professionals/${professionalId}/records/${item.id}`}>
                  <Button variant="ghost">Ver</Button>
                </Link>
              </div>
            ))}
            {!query.data.records.length ? (
              <span className="meta">Todavia no hay registros con este profesional.</span>
            ) : null}
          </div>
        </Card>
      ),
    },
    {
      value: "prescriptions",
      label: "Recetas",
      content: (
        <Card title="Recetas descargables" className="panel-separated">
          <div className="plain-list">
            {query.data.prescriptions.map((item) => (
              <div key={item.id} className="list-row">
                <div className="stack-sm">
                  <strong>{item.medication}</strong>
                  <span className="meta">{item.dose}</span>
                </div>
                <Link to={`/patient/prescriptions/${item.id}`}>
                  <Button variant="ghost">Ver</Button>
                </Link>
              </div>
            ))}
            {!query.data.prescriptions.length ? (
              <span className="meta">Todavia no hay recetas emitidas por este profesional.</span>
            ) : null}
          </div>
        </Card>
      ),
    },
  ];
  const currentTab = tabs.find((item) => item.value === tab);

  return (
    <div className="page-stack viewport-page">
      <div className="subpage-header">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Volver
        </Button>
        <div className="tabs-list">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`tabs-trigger${tab === item.value ? " active" : ""}`}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="viewport-tab-panel">{currentTab?.content}</div>
    </div>
  );
}
