import { describe, expect, it } from "vitest";
import {
  sanitizeEmailInput,
  sanitizeInternalPath,
  sanitizeMultilineInput,
  sanitizeSearchInput,
  sanitizeSingleLineInput,
  sanitizeStudyResourceUrl,
} from "@/shared/utils/sanitize";

describe("sanitize utils", () => {
  it("normalizes single-line, multi-line, email and search inputs", () => {
    expect(sanitizeSingleLineInput("  Hola\u0007   mundo  ")).toBe("Hola mundo");
    expect(sanitizeSingleLineInput("abcdef", 4)).toBe("abcd");
    expect(sanitizeMultilineInput(" \r\nLinea 1\r\nLinea 2\u0007 ")).toBe("Linea 1\nLinea 2");
    expect(sanitizeEmailInput("  USER@Example.COM ")).toBe("user@example.com");
    expect(sanitizeSearchInput("  cardiologia   infantil  ", 12)).toBe("cardiologia ");
  });

  it("accepts only safe internal paths", () => {
    expect(sanitizeInternalPath("/patient/records")).toBe("/patient/records");
    expect(sanitizeInternalPath("/redirect/https://evil.test", "/fallback")).toBe("/fallback");
    expect(sanitizeInternalPath("https://evil.test", "/fallback")).toBe("/fallback");
    expect(sanitizeInternalPath("//evil", "/fallback")).toBe("/fallback");
    expect(sanitizeInternalPath(null, "/fallback")).toBe("/fallback");
  });

  it("sanitizes study resource urls and data uris", () => {
    expect(sanitizeStudyResourceUrl("https://example.com/report.pdf")).toBe(
      "https://example.com/report.pdf",
    );
    expect(
      sanitizeStudyResourceUrl("data:application/pdf;base64,ZmFrZQ==", {
        allowPdfDataUri: true,
      }),
    ).toBe("data:application/pdf;base64,ZmFrZQ==");
    expect(sanitizeStudyResourceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeStudyResourceUrl("nota-valida")).toBeNull();
    expect(sanitizeStudyResourceUrl("   ")).toBeNull();
  });

  it("rejects relative redirects and unsafe pdf data uris by default", () => {
    expect(sanitizeInternalPath(" patient/records ", "/fallback")).toBe("/fallback");
    expect(sanitizeInternalPath(" /patient/\u0007records ")).toBe("/patient/records");
    expect(sanitizeStudyResourceUrl("data:application/pdf;base64,ZmFrZQ==")).toBeNull();
    expect(sanitizeStudyResourceUrl("  https://example.com/image.png  ")).toBe(
      "https://example.com/image.png",
    );
  });
});
