export const argentinaCoverageOptions = [
  { value: "No posee", label: "No posee" },
  { value: "OSDE", label: "OSDE" },
  { value: "Swiss Medical", label: "Swiss Medical" },
  { value: "Galeno", label: "Galeno" },
  { value: "Medife", label: "Medife" },
  { value: "Omint", label: "Omint" },
  { value: "Sancor Salud", label: "Sancor Salud" },
  { value: "Accord Salud", label: "Accord Salud" },
  { value: "Hospital Italiano", label: "Hospital Italiano" },
  { value: "Medicus", label: "Medicus" },
  { value: "Avalian", label: "Avalian" },
  { value: "Prevencion Salud", label: "Prevencion Salud" },
  { value: "Federada Salud", label: "Federada Salud" },
  { value: "Luis Pasteur", label: "Luis Pasteur" },
  { value: "Jerarquicos Salud", label: "Jerarquicos Salud" },
  { value: "OSECAC", label: "OSECAC" },
  { value: "OSDEPYM", label: "OSDEPYM" },
  { value: "OSPE", label: "OSPE" },
  { value: "OSUTHGRA", label: "OSUTHGRA" },
  { value: "OSPOCE", label: "OSPOCE" },
  { value: "Union Personal", label: "Union Personal" },
  { value: "IOMA", label: "IOMA" },
  { value: "PAMI", label: "PAMI" },
  { value: "IOSFA", label: "IOSFA" },
  { value: "OSEP", label: "OSEP" },
  { value: "APROSS", label: "APROSS" },
  { value: "IPROSS", label: "IPROSS" },
  { value: "SEROS", label: "SEROS" },
  { value: "IOSPER", label: "IOSPER" },
  { value: "OSPACA", label: "OSPACA" },
  { value: "OSPAT", label: "OSPAT" },
  { value: "OSSEG", label: "OSSEG" },
  { value: "OSMATA", label: "OSMATA" },
  { value: "OSPEDYC", label: "OSPEDYC" },
  { value: "OSPLAD", label: "OSPLAD" },
  { value: "OSPJN", label: "OSPJN" },
  { value: "OSPATCA", label: "OSPATCA" },
  { value: "DASUTeN", label: "DASUTeN" },
  { value: "Particular", label: "Particular" },
  { value: "__OTHER__", label: "Otro" },
];

export const patientCoverageOptions = [
  { value: "", label: "Seleccionar cobertura" },
  ...argentinaCoverageOptions.filter((option) => option.value !== "__OTHER__"),
  { value: "__OTHER__", label: "Otro" },
];

export const professionalCoverageOptions = [
  { value: "", label: "Seleccionar obra social" },
  ...argentinaCoverageOptions,
];

export const bloodTypeOptions = [
  { value: "", label: "Seleccionar grupo sanguineo" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

export type StudyAttachmentKind = "pdf" | "image";

export interface StudyTypeDefinition {
  value: string;
  label: string;
  attachmentKind: StudyAttachmentKind;
}

export const studyTypeDefinitions: StudyTypeDefinition[] = [
  { value: "Analisis de sangre", label: "Analisis de sangre", attachmentKind: "pdf" },
  { value: "Analisis de orina", label: "Analisis de orina", attachmentKind: "pdf" },
  { value: "Coprocultivo", label: "Coprocultivo", attachmentKind: "pdf" },
  { value: "Biopsia", label: "Biopsia", attachmentKind: "pdf" },
  { value: "Electrocardiograma", label: "Electrocardiograma", attachmentKind: "pdf" },
  { value: "Electroencefalograma", label: "Electroencefalograma", attachmentKind: "pdf" },
  { value: "Holter", label: "Holter", attachmentKind: "pdf" },
  { value: "Ergometria", label: "Ergometria", attachmentKind: "pdf" },
  { value: "Ecocardiograma", label: "Ecocardiograma", attachmentKind: "pdf" },
  { value: "Espirometria", label: "Espirometria", attachmentKind: "pdf" },
  { value: "Ecografia", label: "Ecografia", attachmentKind: "image" },
  { value: "Radiografia", label: "Radiografia", attachmentKind: "image" },
  { value: "Tomografia computada", label: "Tomografia computada", attachmentKind: "image" },
  { value: "Resonancia magnetica", label: "Resonancia magnetica", attachmentKind: "image" },
  { value: "Mamografia", label: "Mamografia", attachmentKind: "image" },
  { value: "Densitometria", label: "Densitometria", attachmentKind: "image" },
  { value: "PET-CT", label: "PET-CT", attachmentKind: "image" },
  { value: "Endoscopia", label: "Endoscopia", attachmentKind: "image" },
  { value: "Colonoscopia", label: "Colonoscopia", attachmentKind: "image" },
  { value: "Audiometria", label: "Audiometria", attachmentKind: "pdf" },
  { value: "Fondo de ojo", label: "Fondo de ojo", attachmentKind: "image" },
  { value: "Papanicolaou", label: "Papanicolaou", attachmentKind: "pdf" },
  { value: "Colposcopia", label: "Colposcopia", attachmentKind: "image" },
  { value: "Estudio de fertilidad", label: "Estudio de fertilidad", attachmentKind: "pdf" },
  { value: "Otro estudio", label: "Otro estudio", attachmentKind: "pdf" },
];

export const studyTypeOptions = studyTypeDefinitions.map((definition) => ({
  value: definition.value,
  label: definition.label,
}));

export function getStudyTypeDefinition(type?: string | null) {
  return (
    studyTypeDefinitions.find((definition) => definition.value === type) ??
    studyTypeDefinitions.find((definition) => definition.value === "Otro estudio")!
  );
}

export function isKnownArgentinaCoverage(value?: string | null) {
  return argentinaCoverageOptions.some((option) => option.value === value);
}
