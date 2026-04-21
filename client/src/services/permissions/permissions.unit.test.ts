import { describe, expect, it } from "vitest";
import { hasPermission, rolePermissions } from "@/services/permissions/permissions";

describe("permissions service", () => {
  it("exposes the expected permission sets for each role", () => {
    expect(rolePermissions.patient).toContain("appointments:read");
    expect(rolePermissions.patient).not.toContain("patients:write");
    expect(rolePermissions.professional).toContain("patients:write");
    expect(rolePermissions.professional).toContain("offices:read");
  });

  it("checks permissions by inclusion", () => {
    expect(hasPermission(rolePermissions.patient, "profile:write")).toBe(true);
    expect(hasPermission(rolePermissions.patient, "patients:read")).toBe(false);
    expect(hasPermission(rolePermissions.professional, "records:write")).toBe(true);
  });
});
