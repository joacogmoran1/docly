import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  getProfessionalAppointments,
} from "@/modules/appointments/api/appointments.api";
import {
  getOfficeBlocks,
  getProfessionalOfficesData,
  getProfessionalPatients,
} from "@/modules/professional/api/professional.api";
import { buildAgendaFromSchedules } from "@/services/api/mappers";
import { useAuth } from "@/app/providers/AuthProvider";
import { BookAppointmentModal } from "@/shared/components/BookAppointmentModal";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import { queryKeys } from "@/shared/constants/query-keys";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate } from "@/shared/utils/date";
import type { ApiOfficeBlock } from "@/shared/types/api";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function applyBlocksToAgenda(agenda: ReturnType<typeof buildAgendaFromSchedules>, blocks: ApiOfficeBlock[]) {
  return agenda.map((entry) => {
    const dayBlocks = blocks.filter(
      (block) => block.officeId === entry.officeId && block.date === entry.date,
    );

    if (!dayBlocks.length) {
      return entry;
    }

    const fullDayBlock = dayBlocks.find((block) => block.type === "full_day");
    if (fullDayBlock) {
      return {
        ...entry,
        freeSlots: [],
        blockedSlots: [],
        bookedSlots: [],
        fullDayBlocked: true,
        fullDayBlockId: fullDayBlock.id,
        fullDayBlockReason: fullDayBlock.reason ?? undefined,
      };
    }

    const blockedRanges = dayBlocks
      .filter((block) => block.type === "time_range" && block.startTime && block.endTime)
      .map((block) => ({
        id: block.id,
        startTime: normalizeTime(block.startTime ?? ""),
        endTime: normalizeTime(block.endTime ?? ""),
        reason: block.reason ?? undefined,
      }));

    const blockedSlots = entry.freeSlots.flatMap((slot) => {
      const matchingRange = blockedRanges.find(
        (range) => slot >= range.startTime && slot < range.endTime,
      );

      if (!matchingRange) {
        return [];
      }

      return [
        {
          id: `blocked-${matchingRange.id}-${slot}`,
          blockId: matchingRange.id,
          time: slot,
          officeId: entry.officeId,
          officeName: entry.officeName,
          reason: matchingRange.reason,
        },
      ];
    });

    return {
      ...entry,
      freeSlots: entry.freeSlots.filter(
        (slot) =>
          !blockedRanges.some(
            (range) => slot >= range.startTime && slot < range.endTime,
          ),
      ),
      blockedSlots,
      fullDayBlocked: false,
      fullDayBlockId: undefined,
      fullDayBlockReason: undefined,
    };
  });
}

export function ProfessionalSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const professionalId = user?.professionalId ?? "";
  const today = getToday();
  const initialMonth = new Date();
  const currentMonthStart = new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [slotToSchedule, setSlotToSchedule] = useState<{
    time: string;
    officeId: string;
    officeName?: string;
  } | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [appointmentToComplete, setAppointmentToComplete] = useState<string | null>(null);
  const [calendarFeedback, setCalendarFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

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
  const blocksQuery = useQuery({
    queryKey: [
      ...queryKeys.professionalSchedule,
      professionalId,
      "blocks",
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      officesQuery.data?.map((office) => office.id).join(",") ?? "",
    ],
    queryFn: async () => {
      if (!officesQuery.data?.length) return [];

      const startDate = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const endDate = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-${String(
        new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate(),
      ).padStart(2, "0")}`;

      const results = await Promise.all(
        officesQuery.data.map((office) =>
          getOfficeBlocks(office.id, {
            startDate,
            endDate,
          }),
        ),
      );

      return results.flat();
    },
    enabled: Boolean(officesQuery.data),
  });
  const patientsQuery = useQuery({
    queryKey: [...queryKeys.professionalPatients, professionalId, "schedule"],
    queryFn: () => getProfessionalPatients(professionalId),
    enabled: Boolean(professionalId),
  });

  const agenda = useMemo(() => {
    if (!agendaQuery.data || !officesQuery.data) return [];
    const baseAgenda = buildAgendaFromSchedules(
      officesQuery.data,
      agendaQuery.data,
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
    return applyBlocksToAgenda(baseAgenda, blocksQuery.data ?? []);
  }, [agendaQuery.data, blocksQuery.data, displayMonth, officesQuery.data]);

  const officeFilter = officeId === "all" ? undefined : officeId;
  const canGoPrevious = displayMonth.getTime() > currentMonthStart.getTime();
  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeFilter),
    [agenda, officeFilter, selectedDate],
  );
  const patientOptions = useMemo(
    () =>
      (patientsQuery.data ?? []).map((patient) => ({
        id: patient.id,
        fullName: patient.fullName,
        meta: patient.email ?? patient.phone ?? patient.document,
      })),
    [patientsQuery.data],
  );
  const createAppointmentMutation = useMutation({
    mutationFn: (patientId: string) =>
      createAppointment({
        patientId,
        officeId: slotToSchedule?.officeId ?? "",
        date: selectedDate,
        time: slotToSchedule?.time ?? "",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalAppointments, professionalId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalSchedule, professionalId],
        }),
      ]);
      setCalendarFeedback({
        tone: "success",
        message: slotToSchedule
          ? `Turno creado para el ${formatNumericDate(selectedDate)} a las ${slotToSchedule.time}${slotToSchedule.officeName ? ` en ${slotToSchedule.officeName}` : ""}. Queda pendiente de confirmacion del paciente.`
          : "Turno creado. Queda pendiente de confirmacion del paciente.",
      });
    },
  });
  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      cancelAppointment(appointmentId, "Cancelado desde agenda del profesional"),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalAppointments, professionalId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalSchedule, professionalId],
        }),
      ]);
      setCalendarFeedback({
        tone: "success",
        message: `Turno cancelado para el ${formatNumericDate(selectedDate)}.`,
      });
      setAppointmentToCancel(null);
    },
    onError: (error) => {
      setCalendarFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cancelar el turno.",
      });
      setAppointmentToCancel(null);
    },
  });
  const completeAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => completeAppointment(appointmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalAppointments, professionalId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalSchedule, professionalId],
        }),
      ]);
      setCalendarFeedback({
        tone: "success",
        message: `Turno marcado como completado para el ${formatNumericDate(selectedDate)}.`,
      });
      setAppointmentToComplete(null);
    },
    onError: (error) => {
      setCalendarFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo completar el turno.",
      });
      setAppointmentToComplete(null);
    },
  });

  if (agendaQuery.isLoading || officesQuery.isLoading || blocksQuery.isLoading || patientsQuery.isLoading) {
    return <div className="centered-feedback">Cargando agenda...</div>;
  }
  if (
    agendaQuery.isError ||
    officesQuery.isError ||
    blocksQuery.isError ||
    patientsQuery.isError ||
    !agendaQuery.data ||
    !officesQuery.data
  ) {
    return <div className="centered-feedback">No pudimos cargar la agenda.</div>;
  }

  return (
    <div className="page-stack viewport-page">
      {calendarFeedback ? (
        <div className={`feedback-banner${calendarFeedback.tone === "error" ? " is-error" : " is-success"}`}>
          <span>{calendarFeedback.message}</span>
          <Button
            variant="ghost"
            className="button-inline"
            onClick={() => setCalendarFeedback(null)}
          >
            Cerrar
          </Button>
        </div>
      ) : null}

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
            canGoPrevious={canGoPrevious}
            minDate={today}
          />
        </section>

        <AgendaDayPanel
          title="Turnos del dia"
          dateLabel={formatNumericDate(selectedDate)}
          items={dayItems}
          onSelectFreeSlot={(slot) => setSlotToSchedule(slot)}
          onCancelBookedSlot={(appointmentId) => setAppointmentToCancel(appointmentId)}
          onCompleteBookedSlot={(appointmentId) => setAppointmentToComplete(appointmentId)}
        />
      </div>

      <BookAppointmentModal
        isOpen={Boolean(slotToSchedule)}
        title="Agendar paciente"
        description={
          slotToSchedule
            ? `Horario seleccionado ${selectedDate} ${slotToSchedule.time}${slotToSchedule.officeName ? ` en ${slotToSchedule.officeName}` : ""}`
            : undefined
        }
        patients={patientOptions}
        isSubmitting={createAppointmentMutation.isPending}
        onClose={() => setSlotToSchedule(null)}
        onConfirm={async (patientId) => {
          await createAppointmentMutation.mutateAsync(patientId);
          setSlotToSchedule(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(appointmentToCancel)}
        title="Cancelar turno"
        description="Se cancelara este turno y dejara de figurar como reservado en la agenda."
        tone="danger"
        confirmLabel={cancelAppointmentMutation.isPending ? "Cancelando..." : "Cancelar turno"}
        onClose={() => setAppointmentToCancel(null)}
        onConfirm={() => {
          if (!appointmentToCancel || cancelAppointmentMutation.isPending) return;
          cancelAppointmentMutation.mutate(appointmentToCancel);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(appointmentToComplete)}
        title="Completar turno"
        description="Se marcara este turno como completado."
        confirmLabel={completeAppointmentMutation.isPending ? "Completando..." : "Completar turno"}
        onClose={() => setAppointmentToComplete(null)}
        onConfirm={() => {
          if (!appointmentToComplete || completeAppointmentMutation.isPending) return;
          completeAppointmentMutation.mutate(appointmentToComplete);
        }}
      />
    </div>
  );
}
