import type { AgendaDay, OfficeItem, PatientListItem, PrescriptionItem, StudyItem } from "@/shared/types/domain";
import { patientHealthMock, patientPrescriptionsMock, patientProfileMock, patientRecordsMock, patientStudiesMock } from "@/mocks/patient";

export const professionalPatientsMock: PatientListItem[] = [
  {
    id: "pt1",
    fullName: "Ana Salvatierra",
    age: 37,
    document: "28.991.203",
    phone: "+54 11 5555 1101",
    coverage: "OSDE 310",
    lastVisit: "2026-03-18",
    nextAppointment: "2026-04-10T17:00:00.000Z",
    alerts: ["Alergia a AINES"],
    studiesCount: 4,
    reportsCount: 3,
    imagesCount: 1,
  },
  {
    id: "pt2",
    fullName: "Juan Vega",
    age: 54,
    document: "20.114.556",
    phone: "+54 11 5555 1102",
    coverage: "Swiss Medical",
    lastVisit: "2026-04-01",
    nextAppointment: "2026-04-08T16:30:00.000Z",
    alerts: ["HTA", "Anticoagulado"],
    studiesCount: 6,
    reportsCount: 4,
    imagesCount: 2,
  },
  {
    id: "pt3",
    fullName: "Paula Juarez",
    age: 46,
    document: "24.567.892",
    phone: "+54 11 5555 1103",
    coverage: "Particular",
    lastVisit: "2026-02-27",
    nextAppointment: "2026-04-09T11:00:00.000Z",
    alerts: [],
    studiesCount: 2,
    reportsCount: 2,
    imagesCount: 0,
  },
];

export const professionalOfficesMock: OfficeItem[] = [
  {
    id: "of1",
    name: "Recoleta",
    address: "Paraguay 1842, CABA",
    notes: "Consultorio principal",
    days: "Lunes a jueves",
    schedule: "09:00 a 17:00",
    appointmentDuration: "30 min",
    weeklyRules: [
      { day: "Lunes", hours: "09:00 - 13:00 / 14:00 - 17:00", duration: "30 min" },
      { day: "Miercoles", hours: "10:00 - 13:00 / 14:00 - 17:00", duration: "30 min" },
      { day: "Jueves", hours: "09:00 - 12:00", duration: "20 min" },
    ],
    blockedDates: ["2026-04-19"],
    blockedTimes: [{ date: "2026-04-10", times: ["12:00", "12:30"] }],
  },
  {
    id: "of2",
    name: "Palermo",
    address: "Guatemala 4012, CABA",
    notes: "Consultorio de viernes",
    days: "Viernes",
    schedule: "09:00 a 15:00",
    appointmentDuration: "20 min",
    weeklyRules: [
      { day: "Viernes", hours: "09:00 - 12:00 / 13:00 - 15:00", duration: "20 min" },
    ],
    blockedDates: [],
    blockedTimes: [],
  },
  {
    id: "of3",
    name: "Teleconsulta",
    address: "Modalidad virtual",
    notes: "Seguimiento remoto",
    days: "Martes y jueves",
    schedule: "18:00 a 20:00",
    appointmentDuration: "20 min",
    weeklyRules: [
      { day: "Martes", hours: "18:00 - 20:00", duration: "20 min" },
      { day: "Jueves", hours: "18:00 - 20:00", duration: "20 min" },
    ],
    blockedDates: ["2026-04-15"],
    blockedTimes: [{ date: "2026-04-09", times: ["19:00"] }],
  },
];

export const professionalAgendaMock: AgendaDay[] = [
  {
    date: "2026-04-08",
    officeId: "of1",
    freeSlots: ["14:00", "15:00", "16:00"],
    bookedSlots: [
      {
        id: "se1",
        officeId: "of1",
        patientId: "pt2",
        patientName: "Juan Vega",
        officeName: "Recoleta",
        date: "2026-04-08T08:30:00.000Z",
        status: "Confirmado",
        reason: "Control HTA",
      },
      {
        id: "se2",
        officeId: "of1",
        patientId: "pt3",
        patientName: "Paula Juarez",
        officeName: "Recoleta",
        date: "2026-04-08T10:00:00.000Z",
        status: "Pendiente",
        reason: "Chequeo clinico",
      },
    ],
  },
  {
    date: "2026-04-09",
    officeId: "of3",
    freeSlots: ["18:00", "18:20"],
    bookedSlots: [
      {
        id: "se3",
        officeId: "of3",
        patientName: "Horario bloqueado",
        officeName: "Teleconsulta",
        date: "2026-04-09T19:00:00.000Z",
        status: "Bloqueado",
        reason: "Bloqueo especial",
      },
    ],
  },
  {
    date: "2026-04-10",
    officeId: "of2",
    freeSlots: ["09:00", "09:20", "09:40"],
    bookedSlots: [
      {
        id: "se4",
        officeId: "of2",
        patientId: "pt1",
        patientName: "Ana Salvatierra",
        officeName: "Palermo",
        date: "2026-04-10T11:00:00.000Z",
        status: "Confirmado",
        reason: "Revision de estudios",
      },
    ],
  },
];

export const professionalProfileMock = {
  personal: {
    fullName: "Dr. Lucas Herrera",
    email: "lucas@docly.app",
    phone: "+54 11 5555 2201",
    document: "26.440.781",
  },
  professional: {
    specialty: "Clinica medica",
    license: "MP 45122",
    digitalSignature: "Firma digital cargada.pdf",
  },
};

export const professionalSettingsMock = {
  email: "lucas@docly.app",
};

export const professionalPrescriptionTemplatesMock = [
  {
    id: "tpl-01",
    name: "Hipertension control",
    summary: "Template base para antihipertensivos y control mensual.",
  },
  {
    id: "tpl-02",
    name: "Laboratorio general",
    summary: "Receta habitual de analisis de control anual.",
  },
];

export const professionalPrescriptionsMock: PrescriptionItem[] = patientPrescriptionsMock;
export const professionalStudiesMock: StudyItem[] = patientStudiesMock;

export const professionalPatientDetailsMock = {
  pt1: {
    patient: professionalPatientsMock[0],
    profile: patientProfileMock,
    health: patientHealthMock,
    records: patientRecordsMock.map((item, index) => ({
      ...item,
      id: `${item.id}-pt1-${index}`,
      summary: item.description,
      fullText: `Registro completo de ${item.title}. ${item.description}.`,
    })),
    studies: patientStudiesMock,
    prescriptions: patientPrescriptionsMock,
  },
  pt2: {
    patient: professionalPatientsMock[1],
    profile: patientProfileMock,
    health: patientHealthMock,
    records: patientRecordsMock.map((item, index) => ({
      ...item,
      id: `${item.id}-pt2-${index}`,
      summary: item.description,
      fullText: `Registro completo de ${item.title}. ${item.description}.`,
    })),
    studies: patientStudiesMock,
    prescriptions: patientPrescriptionsMock,
  },
  pt3: {
    patient: professionalPatientsMock[2],
    profile: patientProfileMock,
    health: patientHealthMock,
    records: patientRecordsMock.map((item, index) => ({
      ...item,
      id: `${item.id}-pt3-${index}`,
      summary: item.description,
      fullText: `Registro completo de ${item.title}. ${item.description}.`,
    })),
    studies: patientStudiesMock,
    prescriptions: patientPrescriptionsMock,
  },
};
