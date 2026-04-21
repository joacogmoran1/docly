import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatNumericDate,
  formatNumericTime,
  formatRelativeDayLabel,
  isPastScheduleSlot,
  toLocalDateTime,
} from "@/shared/utils/date";

describe("date utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats dates and times with the expected locale helpers", () => {
    expect(formatDate("2026-04-19")).toBe(
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date("2026-04-19")),
    );
    expect(formatDateTime("2026-04-19T12:30:00-03:00")).toBe(
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date("2026-04-19T12:30:00-03:00")),
    );
    expect(formatNumericDate("2026-04-19")).toBe(
      new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "numeric",
        year: "2-digit",
      }).format(new Date("2026-04-19")),
    );
    expect(formatNumericTime("2026-04-19T09:05:00-03:00")).toBe(
      new Intl.DateTimeFormat("es-AR", {
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      }).format(new Date("2026-04-19T09:05:00-03:00")),
    );
  });

  it("builds local date-times and detects past schedule slots", () => {
    const localDateTime = toLocalDateTime("2026-04-19", "09:30:45");
    const reference = new Date(2026, 3, 19, 10, 0, 0, 0);

    expect(localDateTime.getFullYear()).toBe(2026);
    expect(localDateTime.getMonth()).toBe(3);
    expect(localDateTime.getDate()).toBe(19);
    expect(localDateTime.getHours()).toBe(9);
    expect(localDateTime.getMinutes()).toBe(30);
    expect(localDateTime.getSeconds()).toBe(0);

    expect(isPastScheduleSlot("2026-04-19", "10:00", reference)).toBe(true);
    expect(isPastScheduleSlot("2026-04-19", "10:30", reference)).toBe(false);
  });

  it("fills missing time parts and uses the current clock by default", () => {
    const localDateTime = toLocalDateTime("2026-04", "9");

    expect(localDateTime.getFullYear()).toBe(2026);
    expect(localDateTime.getMonth()).toBe(3);
    expect(localDateTime.getDate()).toBe(1);
    expect(localDateTime.getHours()).toBe(9);
    expect(localDateTime.getMinutes()).toBe(0);

    expect(isPastScheduleSlot("2026-04-19", "12:00")).toBe(true);
    expect(isPastScheduleSlot("2026-04-19", "12:01")).toBe(false);
  });

  it("falls back missing month, day, and minute segments to zero-like defaults", () => {
    const localDateTime = toLocalDateTime("2026", "09:");

    expect(localDateTime.getFullYear()).toBe(2026);
    expect(localDateTime.getMonth()).toBe(0);
    expect(localDateTime.getDate()).toBe(1);
    expect(localDateTime.getHours()).toBe(9);
    expect(localDateTime.getMinutes()).toBe(0);
  });

  it("falls back to zero hours when the time string is empty", () => {
    const localDateTime = toLocalDateTime("2026-04-19", "");

    expect(localDateTime.getHours()).toBe(0);
    expect(localDateTime.getMinutes()).toBe(0);
  });

  it("labels relative days around today", () => {
    expect(formatRelativeDayLabel("2026-04-19T12:00:00-03:00")).toBe("Hoy");
    expect(formatRelativeDayLabel("2026-04-18T12:00:00-03:00")).toBe("Ayer");
    expect(formatRelativeDayLabel("2026-04-20T12:00:00-03:00").toLowerCase()).toContain("ma");
    expect(formatRelativeDayLabel("2026-04-28T12:00:00-03:00")).not.toBe("Hoy");
  });

  it("falls back to the locale formatter for non-relative dates", () => {
    expect(formatRelativeDayLabel("2026-04-28T12:00:00-03:00")).toBe(
      new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date("2026-04-28T12:00:00-03:00")),
    );
  });
});
