import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPatientProfessionalDetailMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { Select } from "@/shared/ui/Select";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

const TODAY = "2026-04-08";
const CURRENT_MONTH = new Date(2026, 3, 1);

export function PatientProfessionalDetailPage() {
  const navigate = useNavigate();
  const { professionalId = "" } = useParams();
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState("2026-04-09");
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 3, 1));
  const [tab, setTab] = useState("agenda");
  const query = useQuery({
    queryKey: queryKeys.patientProfessionalDetail(professionalId),
    queryFn: () => getPatientProfessionalDetailMock(professionalId),
  });

  const officeFilter = officeId === "all" ? undefined : officeId;
  const dayItems = useMemo(
    () => getAgendaForDate(query.data?.agenda ?? [], selectedDate, officeFilter),
    [officeFilter, query.data?.agenda, selectedDate],
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
                agenda={query.data.agenda}
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
                        ...professional.offices.map((office) => ({
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
                  setDisplayMonth(new Date(2026, 3, 1));
                  setSelectedDate(TODAY);
                }}
                canGoPrevious={displayMonth.getTime() > CURRENT_MONTH.getTime()}
              />
            </section>
            <AgendaDayPanel title="Turnos del dia" dateLabel={formatNumericDate(selectedDate)} items={dayItems} />
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
                  <span className="meta">{item.description}</span>
                </div>
                <Link to={`/patient/professionals/${professionalId}/records/${item.id}`}>
                  <Button variant="ghost">Ver</Button>
                </Link>
              </div>
            ))}
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
                <Button variant="ghost">Descargar</Button>
              </div>
            ))}
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
