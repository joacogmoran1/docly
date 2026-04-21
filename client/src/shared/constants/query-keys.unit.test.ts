import { describe, expect, it } from "vitest";
import { queryKeys } from "@/shared/constants/query-keys";

describe("query keys", () => {
  it("keeps base keys stable", () => {
    expect(queryKeys.session).toEqual(["session"]);
    expect(queryKeys.patientDashboard).toEqual(["patient-dashboard"]);
    expect(queryKeys.professionalSchedule).toEqual(["professional-schedule"]);
    expect(queryKeys.professionalOffices).toEqual(["professional-offices"]);
  });

  it("builds detail keys with the requested ids", () => {
    expect(queryKeys.patientProfessionalDetail("professional-1")).toEqual([
      "patient-professional-detail",
      "professional-1",
    ]);
    expect(queryKeys.professionalPatientDetail("patient-1")).toEqual([
      "professional-patient-detail",
      "patient-1",
    ]);
    expect(queryKeys.professionalOfficeDetail("office-9")).toEqual([
      "professional-office-detail",
      "office-9",
    ]);
  });
});
