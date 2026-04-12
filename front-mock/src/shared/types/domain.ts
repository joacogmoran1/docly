export interface ProfessionalCard {
  id: string;
  fullName: string;
  specialty: string;
  coverage: string[];
  location: string;
  offices: { id: string; name: string }[];
  nextAvailable: string;
  isInTeam: boolean;
  bio: string;
}

export interface AppointmentItem {
  id: string;
  professionalName: string;
  specialty: string;
  date: string;
  office: string;
  status: "Confirmado" | "Pendiente" | "Cancelado";
  type: "Presencial" | "Virtual";
}

export interface StudyItem {
  id: string;
  title: string;
  category: string;
  requestedBy: string;
  date: string;
  status: "Disponible" | "Pendiente" | "Vencido";
  reportSummary: string;
  images: string[];
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  professionalName: string;
  date: string;
  dose: string;
}

export interface HealthSection {
  id: string;
  title: string;
  items: string[];
  updatedAt: string;
  privacy: string;
}

export interface PatientListItem {
  id: string;
  fullName: string;
  age: number;
  document: string;
  phone: string;
  coverage: string;
  lastVisit: string;
  nextAppointment: string;
  alerts: string[];
  studiesCount: number;
  reportsCount: number;
  imagesCount: number;
}

export interface OfficeItem {
  id: string;
  name: string;
  address: string;
  notes: string;
  days: string;
  schedule: string;
  appointmentDuration: string;
  weeklyRules: {
    day: string;
    hours: string;
    duration: string;
  }[];
  blockedDates: string[];
  blockedTimes: {
    date: string;
    times: string[];
  }[];
}

export interface ScheduleEvent {
  id: string;
  officeId: string;
  patientId?: string;
  patientName: string;
  officeName: string;
  date: string;
  status: "Confirmado" | "Pendiente" | "Cancelado" | "Bloqueado";
  reason: string;
}

export interface AgendaDay {
  date: string;
  officeId: string;
  freeSlots: string[];
  bookedSlots: ScheduleEvent[];
}
