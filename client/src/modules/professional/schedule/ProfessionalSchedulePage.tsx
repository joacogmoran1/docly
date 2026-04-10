import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProfessionalOfficesMock,
  getProfessionalPatientsMock,
  getProfessionalScheduleMock,
} from "@/mocks/docly-api";
import { queryKeys } from "@/shared/constants/query-keys";
import { BookAppointmentModal } from "@/shared/components/BookAppointmentModal";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { Select } from "@/shared/ui/Select";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

const TODAY = "2026-04-08";
const CURRENT_MONTH = new Date(2026, 3, 1);

export function ProfessionalSchedulePage() {
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 3, 1));
  const [slotToSchedule, setSlotToSchedule] = useState<string | null>(null);

  const agendaQuery = useQuery({
    queryKey: queryKeys.professionalSchedule,
    queryFn: getProfessionalScheduleMock,
  });
  const officesQuery = useQuery({
    queryKey: queryKeys.professionalOffices,
    queryFn: getProfessionalOfficesMock,
  });
  const patientsQuery = useQuery({
    queryKey: queryKeys.professionalPatients,
    queryFn: getProfessionalPatientsMock,
  });

  const officeFilter = officeId === "all" ? undefined : officeId;
  const dayItems = useMemo(
    () => getAgendaForDate(agendaQuery.data ?? [], selectedDate, officeFilter),
    [agendaQuery.data, officeFilter, selectedDate],
  );

  if (agendaQuery.isLoading || officesQuery.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando agenda...</div>;
  }
  if (
    agendaQuery.isError ||
    officesQuery.isError ||
    patientsQuery.isError ||
    !agendaQuery.data ||
    !officesQuery.data ||
    !patientsQuery.data
  ) {
    return <div className="centered-feedback">No pudimos cargar la agenda.</div>;
  }

  return (
    <div className="page-stack viewport-page">
      <div className="calendar-layout calendar-layout-viewport">
        <section className="panel panel-separated">
          <MonthCalendar
            agenda={agendaQuery.data}
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
                    ...officesQuery.data.map((office) => ({ value: office.id, label: office.name })),
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

        <AgendaDayPanel
          title="Turnos del dia"
          dateLabel={formatNumericDate(selectedDate)}
          items={dayItems}
          onSelectFreeSlot={(slot) => setSlotToSchedule(slot)}
        />
      </div>

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
