import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getProfessionalOfficeDetailMock, getProfessionalPatientsMock } from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { BookAppointmentModal } from "@/shared/components/BookAppointmentModal";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

const durationOptions = [
  { value: "10 min", label: "10 min" },
  { value: "15 min", label: "15 min" },
  { value: "20 min", label: "20 min" },
  { value: "30 min", label: "30 min" },
  { value: "45 min", label: "45 min" },
  { value: "60 min", label: "60 min" },
];

const weekdays = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const TODAY = "2026-04-08";
const CURRENT_MONTH = new Date(2026, 3, 1);

export function ProfessionalOfficeDetailPage() {
  const navigate = useNavigate();
  const { officeId = "" } = useParams();
  const [tab, setTab] = useState("agenda");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 3, 1));
  const [editingData, setEditingData] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [slotToSchedule, setSlotToSchedule] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.professionalOfficeDetail(officeId),
    queryFn: () => getProfessionalOfficeDetailMock(officeId),
  });
  const patientsQuery = useQuery({
    queryKey: queryKeys.professionalPatients,
    queryFn: getProfessionalPatientsMock,
  });

  const dayItems = useMemo(
    () => getAgendaForDate(query.data?.agenda ?? [], selectedDate, officeId),
    [officeId, query.data?.agenda, selectedDate],
  );

  if (query.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando consultorio...</div>;
  }
  if (query.isError || patientsQuery.isError || !query.data || !patientsQuery.data) {
    return <div className="centered-feedback">No pudimos cargar el consultorio.</div>;
  }

  const { office } = query.data;
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
                officeId={officeId}
                year={displayMonth.getFullYear()}
                month={displayMonth.getMonth()}
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
            <AgendaDayPanel
              title="Turnos del dia"
              dateLabel={formatNumericDate(selectedDate)}
              items={dayItems}
              onSelectFreeSlot={(slot) => setSlotToSchedule(slot)}
            />
          </div>
        </div>
      ),
    },
    {
      value: "config",
      label: "Configuracion",
      content: (
        <div className="cards-grid office-config-grid">
          <Card
            title="Datos"
            className="panel-separated card-fit"
            action={
              <div className="form-actions">
                {editingData ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditingData(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setEditingData(false)}>Guardar</Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setEditingData(true)}>
                    Editar
                  </Button>
                )}
              </div>
            }
          >
            <div className="minimal-form">
              <Input label="Nombre" defaultValue={office.name} disabled={!editingData} />
              <Input label="Ubicacion" defaultValue={office.address} disabled={!editingData} />
            </div>
          </Card>

          <Card
            title="Dias, horarios y turnos"
            className="panel-separated office-rules-card"
            action={
              <div className="form-actions">
                {editingRules ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditingRules(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setEditingRules(false)}>Guardar</Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setEditingRules(true)}>
                    Editar
                  </Button>
                )}
              </div>
            }
          >
            <div className="stack-md office-rules-scroll">
              <div className="checkbox-grid">
                {weekdays.map((day) => (
                  <label key={day} className="checkbox-chip">
                    <input
                      type="checkbox"
                      defaultChecked={office.weeklyRules.some((rule) => rule.day === day)}
                      disabled={!editingRules}
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>

              <div className="rules-stack">
                {office.weeklyRules.map((rule, index) => (
                  <div key={`${rule.day}-${index}`} className="day-rule-card">
                    <div className="day-rule-head">
                      <strong>{rule.day}</strong>
                      {editingRules ? (
                        <Button variant="ghost" className="button-inline">
                          Agregar horario
                        </Button>
                      ) : null}
                    </div>

                    <div className="day-rule-body">
                      <div className="schedule-box">
                        <div className="schedule-row">
                          <Input
                            label="Horario 1"
                            defaultValue={rule.hours.split("/")[0]?.trim() ?? ""}
                            disabled={!editingRules}
                          />
                          <Select
                            label="Duracion"
                            options={durationOptions}
                            defaultValue={rule.duration}
                            disabled={!editingRules}
                          />
                          <Button
                            variant="danger"
                            className="button-inline button-remove-slot"
                            disabled={!editingRules}
                          >
                            Quitar horario
                          </Button>
                        </div>
                      </div>

                      <div className="schedule-box">
                        <div className="schedule-row">
                          <Input
                            label="Horario 2"
                            defaultValue={rule.hours.split("/")[1]?.trim() ?? ""}
                            disabled={!editingRules}
                          />
                          <Select
                            label="Duracion"
                            options={durationOptions}
                            defaultValue={rule.duration}
                            disabled={!editingRules}
                          />
                          <Button
                            variant="danger"
                            className="button-inline button-remove-slot"
                            disabled={!editingRules}
                          >
                            Quitar horario
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      value: "special",
      label: "Turnos especiales",
      content: (
        <div className="viewport-section">
          <div className="calendar-layout calendar-layout-viewport">
            <section className="panel panel-separated">
              <MonthCalendar
                agenda={query.data.agenda}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                officeId={officeId}
                year={displayMonth.getFullYear()}
                month={displayMonth.getMonth()}
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
            <AgendaDayPanel
              title="Turnos del dia"
              dateLabel={formatNumericDate(selectedDate)}
              items={dayItems}
              mode="special"
            />
          </div>
        </div>
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

      <BookAppointmentModal
        isOpen={Boolean(slotToSchedule)}
        title="Agendar paciente"
        description={slotToSchedule ? `Horario seleccionado ${selectedDate} ${slotToSchedule}` : undefined}
        patients={patientsQuery.data}
        onClose={() => setSlotToSchedule(null)}
      />
    </div>
  );
}
