import {
  Building2,
  CalendarDays,
  HeartPulse,
  Home,
  Settings,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

export const patientNavigation = [
  { label: "Inicio", to: "/patient", icon: Home },
  { label: "Profesionales", to: "/patient/professionals", icon: Stethoscope },
  { label: "Salud", to: "/patient/health", icon: HeartPulse },
  { label: "Perfil", to: "/patient/profile", icon: UserRound },
  { label: "Configuracion", to: "/patient/settings", icon: Settings },
];

export const professionalNavigation = [
  { label: "Inicio", to: "/professional", icon: Home },
  { label: "Agenda", to: "/professional/schedule", icon: CalendarDays },
  { label: "Pacientes", to: "/professional/patients", icon: Users },
  { label: "Consultorios", to: "/professional/offices", icon: Building2 },
  { label: "Perfil", to: "/professional/profile", icon: UserRound },
  { label: "Configuracion", to: "/professional/settings", icon: Settings },
];
