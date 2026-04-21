import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_STORAGE_VERSION } from "@/shared/config/security";
import { sessionManager } from "@/services/auth/session-manager";

describe("sessionManager", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("persists a versioned session payload", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(window.crypto, "randomUUID").mockReturnValue(
      "11111111-1111-1111-1111-111111111111",
    );

    const stored = sessionManager.persist({
      userId: "user-1",
      role: "patient",
    });

    expect(stored).toEqual({
      version: SESSION_STORAGE_VERSION,
      sessionId: "11111111-1111-1111-1111-111111111111",
      userId: "user-1",
      role: "patient",
      createdAt: 1_700_000_000_000,
      lastActivityAt: 1_700_000_000_000,
    });
    expect(sessionManager.restore()).toEqual(stored);
  });

  it("clears corrupted payloads during restore", () => {
    sessionStorage.setItem(
      "docly:session",
      JSON.stringify({
        version: SESSION_STORAGE_VERSION,
        sessionId: 42,
      }),
    );

    expect(sessionManager.restore()).toBeNull();
    expect(sessionStorage.getItem("docly:session")).toBeNull();
  });

  it("clears empty object payloads during restore", () => {
    sessionStorage.setItem("docly:session", JSON.stringify({}));

    expect(sessionManager.restore()).toBeNull();
    expect(sessionStorage.getItem("docly:session")).toBeNull();
  });

  it("clears null payloads during restore", () => {
    sessionStorage.setItem("docly:session", "null");

    expect(sessionManager.restore()).toBeNull();
    expect(sessionStorage.getItem("docly:session")).toBeNull();
  });

  it("clears malformed JSON payloads during restore", () => {
    sessionStorage.setItem("docly:session", "{malformed");

    expect(sessionManager.restore()).toBeNull();
    expect(sessionStorage.getItem("docly:session")).toBeNull();
  });

  it("touches the active session only when the session id matches", () => {
    sessionStorage.setItem(
      "docly:session",
      JSON.stringify({
        version: SESSION_STORAGE_VERSION,
        sessionId: "session-1",
        userId: "user-1",
        role: "professional",
        createdAt: 100,
        lastActivityAt: 100,
      }),
    );
    vi.spyOn(Date, "now").mockReturnValue(200);

    expect(sessionManager.touch("other-session")).toBeNull();

    const updated = sessionManager.touch("session-1");

    expect(updated?.lastActivityAt).toBe(200);
    expect(sessionManager.restore()?.lastActivityAt).toBe(200);
  });

  it("returns null when touching without a stored session", () => {
    expect(sessionManager.touch()).toBeNull();
  });

  it("falls back to a generated session id and tolerates storage access errors", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_111);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    vi.stubGlobal("crypto", undefined);

    const persisted = sessionManager.persist({
      userId: "user-fallback",
      role: "professional",
    });

    expect(persisted.sessionId).toMatch(/^session-1700000000111-/);

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(sessionManager.restore()).toBeNull();
    expect(() =>
      sessionManager.persist({
        userId: "user-storage-fail",
        role: "patient",
      }),
    ).not.toThrow();
    expect(() => sessionManager.clear()).not.toThrow();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("clears the stored session", () => {
    sessionManager.persist({
      userId: "user-2",
      role: "patient",
    });

    sessionManager.clear();

    expect(sessionManager.restore()).toBeNull();
  });
});
