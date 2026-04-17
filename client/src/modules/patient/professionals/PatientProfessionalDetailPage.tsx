import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { createAppointment } from "@/modules/appointments/api/appointments.api";
import { getPatientProfessionalDetail } from "@/modules/patient/api/patient.api";
import { buildAgendaFromSchedules } from "@/services/api/mappers";
import { queryKeys } from "@/shared/constants/query-keys";
import { MonthCalendar } from "@/shared/components/MonthCalendar";
import { AgendaDayPanel } from "@/shared/components/AgendaDayPanel";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Select } from "@/shared/ui/Select";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getAgendaForDate } from "@/shared/utils/agenda";
import { formatNumericDate, isPastScheduleSlot } from "@/shared/utils/date";
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

export function PatientProfessionalDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { professionalId = "" } = useParams();
  const today = getToday();
  const initialMonth = new Date();
  const currentMonthStart = new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
  const [officeId, setOfficeId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [tab, setTab] = useState("agenda");
  const [slotToBook, setSlotToBook] = useState<{
    time: string;
    officeId: string;
    officeName?: string;
  } | null>(null);
  const [bookingFeedback, setBookingFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
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
    const baseAgenda = buildAgendaFromSchedules(
      query.data.agendaOffices ?? [],
      query.data.appointments,
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
    return applyBlocksToAgenda(baseAgenda, query.data.blocks ?? []);
  }, [displayMonth, query.data]);

  const officeFilter = officeId === "all" ? undefined : officeId;
  const canGoPrevious = displayMonth.getTime() > currentMonthStart.getTime();
  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeFilter),
    [agenda, officeFilter, selectedDate],
  );

  const preventPastBooking = (slot: { time: string; officeId: string; officeName?: string }) => {
    if (!isPastScheduleSlot(selectedDate, slot.time)) {
      return false;
    }

    setBookingFeedback({
      tone: "error",
      message: `Ese horario del ${formatNumericDate(selectedDate)} a las ${slot.time} ya paso y no se puede agendar.`,
    });
    setSlotToBook(null);
    return true;
  };

  const createAppointmentMutation = useMutation({
    mutationFn: () => {
      if (!patientId || !slotToBook) {
        throw new Error("No se pudo preparar el turno.");
      }

      if (isPastScheduleSlot(selectedDate, slotToBook.time)) {
        throw new Error("No se pueden agendar turnos en horarios pasados.");
      }

      return createAppointment({
        professionalId,
        officeId: slotToBook.officeId,
        date: selectedDate,
        time: slotToBook.time,
      });
    },
    onSuccess: async () => {
      const successMessage = slotToBook
        ? `Turno confirmado para el ${formatNumericDate(selectedDate)} a las ${slotToBook.time}${slotToBook.officeName ? ` en ${slotToBook.officeName}` : ""}.`
        : "Turno confirmado exitosamente.";

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.patientProfessionalDetail(professionalId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientDashboard, patientId ?? ""],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.patientAppointments, patientId ?? ""],
        }),
      ]);
      setBookingFeedback({
        tone: "success",
        message: successMessage,
      });
      setSlotToBook(null);
    },
    onError: (error) => {
      setBookingFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo agendar el turno.",
      });
    },
  });

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
                        ...(query.data.agendaOffices ?? professional.offices ?? []).map((office) => ({
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
                canGoPrevious={canGoPrevious}
                minDate={today}
              />
            </section>
            <AgendaDayPanel
              title="Turnos del dia"
              dateLabel={formatNumericDate(selectedDate)}
              items={dayItems}
              mode="patient"
              onSelectFreeSlot={(slot) => {
                if (preventPastBooking(slot)) return;
                setSlotToBook(slot);
              }}
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
      value: "studies",
      label: "Estudios",
      content: (
        <Card title="Estudios" className="panel-separated">
          <div className="plain-list">
            {query.data.studies.map((item) => (
              <div key={item.id} className="list-row">
                <div className="stack-sm">
                  <strong>{item.title}</strong>
                  <span className="meta">{item.reportSummary}</span>
                </div>
                <Link to={`/patient/studies/${item.id}`}>
                  <Button variant="ghost">Ver</Button>
                </Link>
              </div>
            ))}
            {!query.data.studies.length ? (
              <span className="meta">Todavia no hay estudios cargados por este profesional.</span>
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

      {bookingFeedback ? (
        <div
          className={`feedback-banner${bookingFeedback.tone === "error" ? " is-error" : " is-success"}`}
        >
          <span>{bookingFeedback.message}</span>
          <Button
            variant="ghost"
            className="button-inline"
            onClick={() => setBookingFeedback(null)}
          >
            Cerrar
          </Button>
        </div>
      ) : null}

      <div className="viewport-tab-panel">{currentTab?.content}</div>

      <ConfirmDialog
        isOpen={Boolean(slotToBook)}
        title="Confirmar turno"
        description={
          slotToBook
            ? `Vas a agendar un turno para el ${formatNumericDate(selectedDate)} a las ${slotToBook.time}${slotToBook.officeName ? ` en ${slotToBook.officeName}` : ""}.`
            : ""
        }
        confirmLabel={createAppointmentMutation.isPending ? "Agendando..." : "Confirmar turno"}
        onClose={() => setSlotToBook(null)}
        onConfirm={() => {
          if (createAppointmentMutation.isPending) return;
          if (slotToBook && preventPastBooking(slotToBook)) return;
          createAppointmentMutation.mutate();
        }}
      />
    </div>
  );
}
