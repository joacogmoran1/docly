import type { ActivityItem } from "@/shared/types/common";
import type {
  AgendaDay,
  AppointmentItem,
  HealthSection,
  PrescriptionItem,
  ProfessionalCard,
  StudyItem,
} from "@/shared/types/domain";

export const patientProfessionalsMock: ProfessionalCard[] = [
  {
    id: "pr-01",
    fullName: "Dra. Valeria Costa",
    specialty: "Cardiologia",
    coverage: ["Swiss Medical", "OSDE"],
    location: "Recoleta, CABA",
    offices: [
      { id: "of1", name: "Recoleta" },
      { id: "of3", name: "Teleconsulta" },
    ],
    nextAvailable: "2026-04-09T13:30:00.000Z",
    isInTeam: true,
    bio: "Seguimiento cardiovascular preventivo con consultas simples y continuas.",
  },
  {
    id: "pr-02",
    fullName: "Dr. Tomas Quiroga",
    specialty: "Clinica medica",
    coverage: ["Swiss Medical", "Particular"],
    location: "Palermo, CABA",
    offices: [
      { id: "of2", name: "Palermo" },
      { id: "of3", name: "Teleconsulta" },
    ],
    nextAvailable: "2026-04-10T09:00:00.000Z",
    isInTeam: true,
    bio: "Seguimiento clinico longitudinal con foco en claridad y orden.",
  },
  {
    id: "pr-03",
    fullName: "Lic. Camila Gomez",
    specialty: "Nutricion",
    coverage: ["Particular", "OSDE"],
    location: "Belgrano, CABA",
    offices: [{ id: "of4", name: "Belgrano" }],
    nextAvailable: "2026-04-11T18:00:00.000Z",
    isInTeam: false,
    bio: "Consultas de nutricion con objetivos concretos y seguimiento liviano.",
  },
];

export const patientAppointmentsMock: AppointmentItem[] = [
  {
    id: "a1",
    professionalName: "Dra. Valeria Costa",
    specialty: "Cardiologia",
    date: "2026-04-09T13:30:00.000Z",
    office: "Recoleta",
    status: "Confirmado",
    type: "Presencial",
  },
  {
    id: "a2",
    professionalName: "Dr. Tomas Quiroga",
    specialty: "Clinica medica",
    date: "2026-04-18T09:15:00.000Z",
    office: "Teleconsulta",
    status: "Pendiente",
    type: "Virtual",
  },
];

export const patientStudiesMock: StudyItem[] = [
  {
    id: "s1",
    title: "Laboratorio anual",
    category: "Laboratorio",
    requestedBy: "Dr. Tomas Quiroga",
    date: "2026-04-05T08:00:00.000Z",
    status: "Disponible",
    reportSummary: "Valores dentro de rango con leve aumento de colesterol LDL.",
    images: [],
  },
  {
    id: "s2",
    title: "Ecocardiograma",
    category: "Cardiologia",
    requestedBy: "Dra. Valeria Costa",
    date: "2026-03-22T14:00:00.000Z",
    status: "Disponible",
    reportSummary: "Funcion ventricular conservada. Sin hallazgos significativos.",
    images: ["Vista paraesternal", "Vista apical"],
  },
  {
    id: "s3",
    title: "Radiografia de torax",
    category: "Imagenes",
    requestedBy: "Dr. Tomas Quiroga",
    date: "2026-04-02T11:00:00.000Z",
    status: "Disponible",
    reportSummary: "Sin consolidaciones. Campos pulmonares sin alteraciones agudas.",
    images: ["Frente", "Perfil"],
  },
];

export const patientPrescriptionsMock: PrescriptionItem[] = [
  {
    id: "rx1",
    medication: "Levotiroxina 75 mcg",
    professionalName: "Dr. Tomas Quiroga",
    date: "2026-04-08T10:00:00.000Z",
    dose: "1 comprimido por la manana",
  },
  {
    id: "rx2",
    medication: "Bisoprolol 2.5 mg",
    professionalName: "Dra. Valeria Costa",
    date: "2026-03-10T11:00:00.000Z",
    dose: "1 comprimido luego del desayuno",
  },
];

export const patientHealthMock: HealthSection[] = [
  {
    id: "h1",
    title: "Alergias",
    items: ["Penicilina", "Latex"],
    updatedAt: "2026-03-10T12:00:00.000Z",
    privacy: "Visible para profesionales autorizados",
  },
  {
    id: "h2",
    title: "Medicacion habitual",
    items: ["Levotiroxina 75 mcg", "Bisoprolol 2.5 mg"],
    updatedAt: "2026-04-01T08:30:00.000Z",
    privacy: "Visible para el profesional tratante",
  },
  {
    id: "h3",
    title: "Antecedentes",
    items: ["Hipotiroidismo", "Antecedente familiar de HTA"],
    updatedAt: "2026-02-14T16:15:00.000Z",
    privacy: "Visible bajo consentimiento",
  },
];

export const patientRecordsMock: ActivityItem[] = [
  {
    id: "pa1",
    title: "Control clinico",
    description: "Se registro control general y ajuste de medicacion.",
    timestamp: "2026-04-07T18:30:00.000Z",
    type: "record",
  },
  {
    id: "pa2",
    title: "Consulta de cardiologia",
    description: "Seguimiento anual sin cambios relevantes.",
    timestamp: "2026-03-22T16:00:00.000Z",
    type: "record",
  },
];

export const patientProfileMock = {
  fullName: "Sofia Martinez",
  email: "sofia@docly.app",
  phone: "+54 11 5555 0101",
  document: "32.145.678",
  birthDate: "12/09/1992",
  coverage: "Swiss Medical",
};

export const patientSettingsMock = {
  email: "sofia@docly.app",
  permissions: [
    { id: "ac1", professional: "Dra. Valeria Costa", scope: "Recetas y estudios cardiologicos" },
    { id: "ac2", professional: "Dr. Tomas Quiroga", scope: "Historia clinica general" },
  ],
};

export const patientProfessionalAgendaMock: Record<string, AgendaDay[]> = {
  "pr-01": [
    {
      date: "2026-04-09",
      officeId: "of1",
      freeSlots: ["13:30", "14:00", "14:30"],
      bookedSlots: [
        {
          id: "e1",
          officeId: "of1",
          patientName: "Paciente reservado",
          officeName: "Recoleta",
          date: "2026-04-09T15:00:00.000Z",
          status: "Confirmado",
          reason: "Control",
        },
      ],
    },
    {
      date: "2026-04-10",
      officeId: "of3",
      freeSlots: ["10:00", "10:30"],
      bookedSlots: [],
    },
  ],
  "pr-02": [
    {
      date: "2026-04-10",
      officeId: "of2",
      freeSlots: ["09:00", "09:30", "10:00"],
      bookedSlots: [],
    },
    {
      date: "2026-04-11",
      officeId: "of3",
      freeSlots: ["18:00"],
      bookedSlots: [
        {
          id: "e2",
          officeId: "of3",
          patientName: "Paciente reservado",
          officeName: "Teleconsulta",
          date: "2026-04-11T17:30:00.000Z",
          status: "Confirmado",
          reason: "Control",
        },
      ],
    },
  ],
  "pr-03": [
    {
      date: "2026-04-11",
      officeId: "of4",
      freeSlots: ["18:00", "18:30"],
      bookedSlots: [],
    },
  ],
};
