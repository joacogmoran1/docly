import { describe, expect, it } from "vitest";
import {
  argentinaCoverageOptions,
  getStudyTypeDefinition,
  isKnownArgentinaCoverage,
  patientCoverageOptions,
  professionalCoverageOptions,
  studyTypeOptions,
} from "@/shared/constants/medical-options";

describe("medical options", () => {
  it("builds study definitions and falls back for unknown types", () => {
    expect(getStudyTypeDefinition("Radiografia")).toMatchObject({
      value: "Radiografia",
      attachmentKind: "image",
    });
    expect(getStudyTypeDefinition("Tipo inexistente")).toMatchObject({
      value: "Otro estudio",
      attachmentKind: "pdf",
    });
    expect(studyTypeOptions).toContainEqual({
      value: "Radiografia",
      label: "Radiografia",
    });
  });

  it("flags known coverages and keeps patient/professional option differences", () => {
    expect(isKnownArgentinaCoverage("OSDE")).toBe(true);
    expect(isKnownArgentinaCoverage("__OTHER__")).toBe(true);
    expect(isKnownArgentinaCoverage("Cobertura inventada")).toBe(false);
    expect(argentinaCoverageOptions.some((option) => option.value === "__OTHER__")).toBe(true);
    expect(patientCoverageOptions[0]).toEqual({
      value: "",
      label: "Seleccionar cobertura",
    });
    expect(professionalCoverageOptions[0]).toEqual({
      value: "",
      label: "Seleccionar obra social",
    });
  });
});
