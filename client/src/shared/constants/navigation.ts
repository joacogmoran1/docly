import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  Settings,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

export const patientNavigation = [
  { label: "Inicio", to: "/patient", icon: Home },
  { label: "Turnos", to: "/patient/appointments", icon: CalendarDays },
  { label: "Registros", to: "/patient/records", icon: ClipboardList },
  { label: "Estudios", to: "/patient/studies", icon: FlaskConical },
  { label: "Recetas", to: "/patient/prescriptions", icon: FileText },
  { label: "Profesionales", to: "/patient/professionals", icon: Stethoscope },
  { label: "Salud", to: "/patient/health", icon: HeartPulse },
  { label: "Perfil", to: "/patient/profile", icon: UserRound },
  { label: "Configuracion", to: "/patient/settings", icon: Settings },
];

export const professionalNavigation = [
  { label: "Inicio", to: "/professional", icon: Home },
  { label: "Agenda", to: "/professional/schedule", icon: CalendarDays },
  { label: "Pacientes", to: "/professional/patients", icon: Users },
  { label: "Registros", to: "/professional/records", icon: ClipboardList },
  { label: "Consultorios", to: "/professional/offices", icon: Building2 },
  { label: "Estudios", to: "/professional/studies", icon: FlaskConical },
  { label: "Recetas", to: "/professional/prescriptions", icon: FileText },
  { label: "Perfil", to: "/professional/profile", icon: UserRound },
  { label: "Configuracion", to: "/professional/settings", icon: Settings },
];
