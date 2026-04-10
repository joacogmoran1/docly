import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAppointment, getProfessionalAppointments } from "@/modules/appointments/api/appointments.api";
import { getProfessionalOfficesData } from "@/modules/professional/api/professional.api";
import { buildAgendaFromSchedules, mapAppointmentsToPatientOptions } from "@/services/api/mappers";
import { useAuth } from "@/app/providers/AuthProvider";
import { BookAppointmentModal } from "@/shared/components/BookAppointmentModal";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { Select } from "@/shared/ui/Select";
import { queryKeys } from "@/shared/constants/query-keys";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ProfessionalSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const today = getToday();
  const initialMonth = new Date();
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [slotToSchedule, setSlotToSchedule] = useState<string | null>(null);

  const agendaQuery = useQuery({
    queryKey: [...queryKeys.professionalAppointments, professionalId],
    queryFn: () => getProfessionalAppointments(professionalId),
    enabled: Boolean(professionalId),
  });
  const officesQuery = useQuery({
    queryKey: [...queryKeys.professionalOffices, professionalId, "raw"],
    queryFn: () => getProfessionalOfficesData(professionalId),
    enabled: Boolean(professionalId),
  });

  const agenda = useMemo(() => {
    if (!agendaQuery.data || !officesQuery.data) return [];
    return buildAgendaFromSchedules(
      officesQuery.data,
      agendaQuery.data,
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
  }, [agendaQuery.data, displayMonth, officesQuery.data]);

  const officeFilter = officeId === "all" ? undefined : officeId;
  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeFilter),
    [agenda, officeFilter, selectedDate],
  );
  const patientOptions = useMemo(
    () => mapAppointmentsToPatientOptions(agendaQuery.data ?? []),
    [agendaQuery.data],
  );
  const createAppointmentMutation = useMutation({
    mutationFn: (patientId: string) =>
      createAppointment({
        patientId,
        professionalId,
        officeId: officeFilter ?? "",
        date: selectedDate,
        time: slotToSchedule ?? "",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.professionalAppointments, professionalId],
      });
    },
  });

  if (agendaQuery.isLoading || officesQuery.isLoading) {
    return <div className="centered-feedback">Cargando agenda...</div>;
  }
  if (
    agendaQuery.isError ||
    officesQuery.isError ||
    !agendaQuery.data ||
    !officesQuery.data
  ) {
    return <div className="centered-feedback">No pudimos cargar la agenda.</div>;
  }

  return (
    <div className="page-stack viewport-page">
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
          onSelectFreeSlot={officeFilter ? (slot) => setSlotToSchedule(slot) : undefined}
        />
      </div>

      <BookAppointmentModal
        isOpen={Boolean(slotToSchedule && officeFilter)}
        title="Agendar paciente"
        description={
          slotToSchedule ? `Horario seleccionado ${selectedDate} ${slotToSchedule}` : undefined
        }
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
