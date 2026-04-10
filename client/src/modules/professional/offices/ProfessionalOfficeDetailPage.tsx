import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createAppointment,
  getProfessionalAppointments,
} from "@/modules/appointments/api/appointments.api";
import { getProfessionalOffice } from "@/modules/professional/api/professional.api";
import { buildAgendaFromSchedules, mapAppointmentsToPatientOptions } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { BookAppointmentModal } from "@/shared/components/BookAppointmentModal";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const weekdayLabels = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export function ProfessionalOfficeDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { officeId = "" } = useParams();
  const today = getToday();
  const initialMonth = new Date();
  const [tab, setTab] = useState("agenda");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [slotToSchedule, setSlotToSchedule] = useState<string | null>(null);

  const officeQuery = useQuery({
    queryKey: [...queryKeys.professionalOfficeDetail(officeId), "office"],
    queryFn: () => getProfessionalOffice(officeId),
    enabled: Boolean(officeId),
  });
  const appointmentsQuery = useQuery({
    queryKey: [...queryKeys.professionalAppointments, officeId],
    queryFn: async () => {
      const office = await getProfessionalOffice(officeId);
      return getProfessionalAppointments(office.professionalId);
    },
    enabled: Boolean(officeId),
  });

  const agenda = useMemo(() => {
    if (!officeQuery.data || !appointmentsQuery.data) return [];
    return buildAgendaFromSchedules(
      [officeQuery.data],
      appointmentsQuery.data.filter((appointment) => appointment.officeId === officeQuery.data?.id),
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
  }, [appointmentsQuery.data, displayMonth, officeQuery.data]);

  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeId),
    [agenda, officeId, selectedDate],
  );
  const patientOptions = useMemo(
    () => mapAppointmentsToPatientOptions(appointmentsQuery.data ?? []),
    [appointmentsQuery.data],
  );
  const createAppointmentMutation = useMutation({
    mutationFn: (patientId: string) => {
      if (!officeQuery.data || !slotToSchedule) {
        throw new Error("No se pudo preparar el turno.");
      }

      return createAppointment({
        patientId,
        professionalId: officeQuery.data.professionalId,
        officeId: officeQuery.data.id,
        date: selectedDate,
        time: slotToSchedule,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalAppointments, officeId],
      });
    },
  });

  if (officeQuery.isLoading || appointmentsQuery.isLoading) {
    return <div className="centered-feedback">Cargando consultorio...</div>;
  }
  if (officeQuery.isError || appointmentsQuery.isError || !officeQuery.data || !appointmentsQuery.data) {
    return <div className="centered-feedback">No pudimos cargar el consultorio.</div>;
  }

  const office = officeQuery.data;
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
          <Card title="Datos" className="panel-separated card-fit">
            <div className="plain-list">
              <div className="list-row">
                <div className="stack-sm">
                  <strong>Nombre</strong>
                  <span className="meta">{office.name}</span>
                </div>
              </div>
              <div className="list-row">
                <div className="stack-sm">
                  <strong>Direccion</strong>
                  <span className="meta">{office.address}</span>
                </div>
              </div>
              <div className="list-row">
                <div className="stack-sm">
                  <strong>Telefono</strong>
                  <span className="meta">{office.phone ?? "Sin telefono cargado"}</span>
                </div>
              </div>
              <div className="list-row">
                <div className="stack-sm">
                  <strong>Duracion por turno</strong>
                  <span className="meta">{office.appointmentDuration} min</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Horarios" className="panel-separated office-rules-card">
            <div className="plain-list">
              {(office.schedules ?? []).filter((schedule) => schedule.isActive).map((schedule, index) => (
                <div key={`${schedule.dayOfWeek}-${index}`} className="list-row">
                  <div className="stack-sm">
                    <strong>{weekdayLabels[schedule.dayOfWeek] ?? "Dia"}</strong>
                    <span className="meta">
                      {schedule.startTime.slice(0, 5)} a {schedule.endTime.slice(0, 5)}
                    </span>
                  </div>
                </div>
              ))}
              {!(office.schedules ?? []).length ? (
                <span className="meta">Este consultorio todavia no tiene horarios configurados.</span>
              ) : null}
            </div>
          </Card>
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
        patients={patientOptions}
        isSubmitting={createAppointmentMutation.isPending}
        onClose={() => setSlotToSchedule(null)}
        onConfirm={async (patientId) => {
          await createAppointmentMutation.mutateAsync(patientId);
          setSlotToSchedule(null);
        }}
      />
    </div>
  );
}
