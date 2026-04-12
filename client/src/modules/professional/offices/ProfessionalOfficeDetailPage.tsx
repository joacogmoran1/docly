import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createAppointment,
  getProfessionalAppointments,
} from "@/modules/appointments/api/appointments.api";
import {
  getProfessionalOffice,
  getProfessionalPatients,
  updateProfessionalOffice,
} from "@/modules/professional/api/professional.api";
import { buildAgendaFromSchedules } from "@/services/api/mappers";
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
import type { ApiOffice, ApiSchedule } from "@/shared/types/api";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const durationOptions = [
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

const weekdayOptions = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" },
];

interface OfficeRuleSlotForm {
  id: string;
  startTime: string;
  endTime: string;
}

interface OfficeRuleDayForm {
  dayOfWeek: number;
  slots: OfficeRuleSlotForm[];
}

interface OfficeFormState {
  name: string;
  address: string;
  phone: string;
  appointmentDuration: string;
  scheduleDays: OfficeRuleDayForm[];
}

function buildSlotId(seed: string) {
  return `${seed}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function sortScheduleDays(days: OfficeRuleDayForm[]) {
  const order = new Map(weekdayOptions.map((day, index) => [day.value, index]));
  return [...days].sort(
    (left, right) => (order.get(left.dayOfWeek) ?? 99) - (order.get(right.dayOfWeek) ?? 99),
  );
}

function mapSchedulesToForm(schedules: ApiSchedule[] | undefined): OfficeRuleDayForm[] {
  const activeSchedules = (schedules ?? []).filter((schedule) => schedule.isActive);
  const registry = new Map<number, OfficeRuleDayForm>();

  activeSchedules.forEach((schedule, index) => {
    const current =
      registry.get(schedule.dayOfWeek) ??
      {
        dayOfWeek: schedule.dayOfWeek,
        slots: [],
      };

    current.slots.push({
      id: schedule.id ?? buildSlotId(`${schedule.dayOfWeek}-${index}`),
      startTime: normalizeTime(schedule.startTime),
      endTime: normalizeTime(schedule.endTime),
    });

    registry.set(schedule.dayOfWeek, current);
  });

  return sortScheduleDays(Array.from(registry.values())).map((day) => ({
    ...day,
    slots: day.slots.sort((left, right) => left.startTime.localeCompare(right.startTime)),
  }));
}

function mapOfficeToForm(office: ApiOffice): OfficeFormState {
  return {
    name: office.name,
    address: office.address,
    phone: office.phone ?? "",
    appointmentDuration: String(office.appointmentDuration),
    scheduleDays: mapSchedulesToForm(office.schedules),
  };
}

function mapFormToSchedule(days: OfficeRuleDayForm[]) {
  return sortScheduleDays(days).flatMap((day) =>
    day.slots
      .filter((slot) => slot.startTime && slot.endTime)
      .map((slot) => ({
        dayOfWeek: day.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: true,
      })),
  );
}

function getWeekdayLabel(dayOfWeek: number) {
  return weekdayOptions.find((day) => day.value === dayOfWeek)?.label ?? "Dia";
}

export function ProfessionalOfficeDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { officeId = "" } = useParams();
  const today = getToday();
  const initialMonth = new Date();
  const [tab, setTab] = useState("agenda");
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [editingData, setEditingData] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [slotToSchedule, setSlotToSchedule] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [officeForm, setOfficeForm] = useState<OfficeFormState | null>(null);

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
  const patientsQuery = useQuery({
    queryKey: [
      ...queryKeys.professionalPatients,
      officeQuery.data?.professionalId ?? "",
      "office-detail",
    ],
    queryFn: () => getProfessionalPatients(officeQuery.data?.professionalId ?? ""),
    enabled: Boolean(officeQuery.data?.professionalId),
  });

  useEffect(() => {
    if (officeQuery.data) {
      setOfficeForm(mapOfficeToForm(officeQuery.data));
    }
  }, [officeQuery.data]);

  const agenda = useMemo(() => {
    if (!officeQuery.data || !appointmentsQuery.data) return [];
    return buildAgendaFromSchedules(
      [officeQuery.data],
      appointmentsQuery.data.filter((appointment) => appointment.officeId === officeQuery.data.id),
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
    );
  }, [appointmentsQuery.data, displayMonth, officeQuery.data]);

  const dayItems = useMemo(
    () => getAgendaForDate(agenda, selectedDate, officeId),
    [agenda, officeId, selectedDate],
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
  const updateOfficeMutation = useMutation({
    mutationFn: (section: "data" | "rules") => {
      if (!officeForm) {
        throw new Error("No hay datos para guardar.");
      }

      if (section === "data") {
        return updateProfessionalOffice(officeId, {
          name: officeForm.name,
          address: officeForm.address,
          phone: officeForm.phone || undefined,
          appointmentDuration: Number(officeForm.appointmentDuration),
        });
      }

      return updateProfessionalOffice(officeId, {
        appointmentDuration: Number(officeForm.appointmentDuration),
        schedule: mapFormToSchedule(officeForm.scheduleDays),
      });
    },
    onSuccess: async (nextOffice) => {
      setOfficeForm(mapOfficeToForm(nextOffice));
      setEditingData(false);
      setEditingRules(false);
      setServerError(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalOfficeDetail(officeId), "office"],
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.professionalAppointments, officeId],
        }),
      ]);
    },
    onError: (error) => {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el consultorio.");
    },
  });

  const hasDay = (dayOfWeek: number) =>
    officeForm?.scheduleDays.some((day) => day.dayOfWeek === dayOfWeek) ?? false;

  const toggleDay = (dayOfWeek: number) => {
    setOfficeForm((current) => {
      if (!current) return current;

      if (current.scheduleDays.some((day) => day.dayOfWeek === dayOfWeek)) {
        return {
          ...current,
          scheduleDays: current.scheduleDays.filter((day) => day.dayOfWeek !== dayOfWeek),
        };
      }

      return {
        ...current,
        scheduleDays: sortScheduleDays([
          ...current.scheduleDays,
          {
            dayOfWeek,
            slots: [
              {
                id: buildSlotId(String(dayOfWeek)),
                startTime: "09:00",
                endTime: "13:00",
              },
            ],
          },
        ]),
      };
    });
  };

  const addSlot = (dayOfWeek: number) => {
    setOfficeForm((current) => {
      if (!current) return current;

      return {
        ...current,
        scheduleDays: current.scheduleDays.map((day) =>
          day.dayOfWeek === dayOfWeek
            ? {
                ...day,
                slots: [
                  ...day.slots,
                  {
                    id: buildSlotId(`${dayOfWeek}-${day.slots.length}`),
                    startTime: "15:00",
                    endTime: "19:00",
                  },
                ],
              }
            : day,
        ),
      };
    });
  };

  const updateSlot = (
    dayOfWeek: number,
    slotId: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setOfficeForm((current) => {
      if (!current) return current;

      return {
        ...current,
        scheduleDays: current.scheduleDays.map((day) =>
          day.dayOfWeek === dayOfWeek
            ? {
                ...day,
                slots: day.slots.map((slot) =>
                  slot.id === slotId ? { ...slot, [field]: value } : slot,
                ),
              }
            : day,
        ),
      };
    });
  };

  const removeSlot = (dayOfWeek: number, slotId: string) => {
    setOfficeForm((current) => {
      if (!current) return current;

      const nextDays = current.scheduleDays
        .map((day) =>
          day.dayOfWeek === dayOfWeek
            ? {
                ...day,
                slots: day.slots.filter((slot) => slot.id !== slotId),
              }
            : day,
        )
        .filter((day) => day.slots.length > 0);

      return {
        ...current,
        scheduleDays: nextDays,
      };
    });
  };

  if (officeQuery.isLoading || appointmentsQuery.isLoading || patientsQuery.isLoading || !officeForm) {
    return <div className="centered-feedback">Cargando consultorio...</div>;
  }
  if (
    officeQuery.isError ||
    appointmentsQuery.isError ||
    patientsQuery.isError ||
    !officeQuery.data ||
    !appointmentsQuery.data
  ) {
    return <div className="centered-feedback">No pudimos cargar el consultorio.</div>;
  }

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
          <Card
            title="Datos"
            className="panel-separated card-fit"
            action={
              <div className="form-actions">
                {editingData ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingData(false);
                        if (officeQuery.data) {
                          setOfficeForm(mapOfficeToForm(officeQuery.data));
                        }
                        setServerError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => updateOfficeMutation.mutate("data")}
                      disabled={updateOfficeMutation.isPending}
                    >
                      {updateOfficeMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
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
              <Input
                label="Nombre"
                value={officeForm.name}
                disabled={!editingData}
                onChange={(event) =>
                  setOfficeForm((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
              />
              <Input
                label="Ubicacion"
                value={officeForm.address}
                disabled={!editingData}
                onChange={(event) =>
                  setOfficeForm((current) =>
                    current ? { ...current, address: event.target.value } : current,
                  )
                }
              />
              <Input
                label="Telefono"
                value={officeForm.phone}
                disabled={!editingData}
                onChange={(event) =>
                  setOfficeForm((current) =>
                    current ? { ...current, phone: event.target.value } : current,
                  )
                }
              />
              <Select
                label="Duracion por turno"
                options={durationOptions}
                value={officeForm.appointmentDuration}
                disabled={!editingData}
                onChange={(event) =>
                  setOfficeForm((current) =>
                    current ? { ...current, appointmentDuration: event.target.value } : current,
                  )
                }
              />
              {serverError ? <span className="field-error">{serverError}</span> : null}
            </div>
          </Card>

          <Card
            title="Dias, horarios y turnos"
            className="panel-separated office-rules-card"
            action={
              <div className="form-actions">
                {editingRules ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingRules(false);
                        if (officeQuery.data) {
                          setOfficeForm(mapOfficeToForm(officeQuery.data));
                        }
                        setServerError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => updateOfficeMutation.mutate("rules")}
                      disabled={updateOfficeMutation.isPending}
                    >
                      {updateOfficeMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
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
                {weekdayOptions.map((day) => (
                  <label key={day.value} className="checkbox-chip">
                    <input
                      type="checkbox"
                      checked={hasDay(day.value)}
                      disabled={!editingRules}
                      onChange={() => toggleDay(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>

              <div className="rules-stack">
                {officeForm.scheduleDays.map((day) => (
                  <div key={day.dayOfWeek} className="day-rule-card">
                    <div className="day-rule-head">
                      <strong>{getWeekdayLabel(day.dayOfWeek)}</strong>
                      {editingRules ? (
                        <Button
                          variant="ghost"
                          className="button-inline"
                          onClick={() => addSlot(day.dayOfWeek)}
                        >
                          Agregar horario
                        </Button>
                      ) : null}
                    </div>

                    <div className="day-rule-body">
                      {day.slots.map((slot, index) => (
                        <div key={slot.id} className="schedule-box">
                          <div className="schedule-row">
                            <Input
                              label={`Horario ${index + 1}`}
                              type="time"
                              value={slot.startTime}
                              disabled={!editingRules}
                              onChange={(event) =>
                                updateSlot(day.dayOfWeek, slot.id, "startTime", event.target.value)
                              }
                            />
                            <Input
                              label="Hasta"
                              type="time"
                              value={slot.endTime}
                              disabled={!editingRules}
                              onChange={(event) =>
                                updateSlot(day.dayOfWeek, slot.id, "endTime", event.target.value)
                              }
                            />
                            <Select
                              label="Duracion"
                              options={durationOptions}
                              value={officeForm.appointmentDuration}
                              disabled={!editingRules}
                              onChange={(event) =>
                                setOfficeForm((current) =>
                                  current
                                    ? { ...current, appointmentDuration: event.target.value }
                                    : current,
                                )
                              }
                            />
                            <Button
                              variant="danger"
                              className="button-inline button-remove-slot"
                              disabled={!editingRules}
                              onClick={() => removeSlot(day.dayOfWeek, slot.id)}
                            >
                              Quitar horario
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!officeForm.scheduleDays.length ? (
                  <span className="meta">Este consultorio todavia no tiene horarios configurados.</span>
                ) : null}
              </div>

              {serverError ? <span className="field-error">{serverError}</span> : null}
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
