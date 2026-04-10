import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  const navigate = useNavigate();
  const { professionalId = "" } = useParams();
  const today = getToday();
  const initialMonth = new Date();
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [tab, setTab] = useState("agenda");
  const query = useQuery({
    queryKey: [...queryKeys.patientProfessionalDetail(professionalId), displayMonth.getFullYear(), displayMonth.getMonth()],
    queryFn: () =>
      getPatientProfessionalDetail(
        professionalId,
        displayMonth.getFullYear(),
        displayMonth.getMonth(),
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
              title="Agenda del profesional"
              dateLabel={formatNumericDate(selectedDate)}
              items={dayItems}
              mode="patient"
            />
          </div>
        </div>
      ),
    },
    {
      value: "info",
      label: "Informacion",
      content: (
        <Card title="Perfil profesional" className="panel-separated">
          <div className="plain-list">
            <div className="list-row">
              <div className="stack-sm">
                <strong>Nombre</strong>
                <span className="meta">
                  {[professional.user.name, professional.user.lastName].filter(Boolean).join(" ")}
                </span>
              </div>
            </div>
            <div className="list-row">
              <div className="stack-sm">
                <strong>Especialidad</strong>
                <span className="meta">{professional.specialty}</span>
              </div>
            </div>
            <div className="list-row">
              <div className="stack-sm">
                <strong>Matricula</strong>
                <span className="meta">{professional.licenseNumber}</span>
              </div>
            </div>
            <div className="list-row">
              <div className="stack-sm">
                <strong>Coberturas</strong>
                <span className="meta">
                  {professional.acceptedCoverages.length
                    ? professional.acceptedCoverages.join(", ")
                    : "Sin coberturas cargadas"}
                </span>
              </div>
            </div>
            <div className="list-row">
              <div className="stack-sm">
                <strong>Honorarios</strong>
                <span className="meta">
                  {professional.fees ? `$${professional.fees}` : "A confirmar"}
                </span>
              </div>
            </div>
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
