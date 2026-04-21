import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionChannelMocks = vi.hoisted(() => ({
  publish: vi.fn(),
}));

const sessionManagerMocks = vi.hoisted(() => ({
  restore: vi.fn(),
  clear: vi.fn(),
}));

const csrfMocks = vi.hoisted(() => ({
  ensureCsrfCookie: vi.fn(),
  getCsrfHeaderName: vi.fn(),
  getCsrfTokenFromCookie: vi.fn(),
}));

vi.mock("@/services/auth/session-channel", () => ({
  sessionChannel: sessionChannelMocks,
}));

vi.mock("@/services/auth/session-manager", () => ({
  sessionManager: sessionManagerMocks,
}));

vi.mock("@/services/security/csrf", () => csrfMocks);

describe("attachInterceptors", () => {
  beforeEach(() => {
    sessionChannelMocks.publish.mockReset();
    sessionManagerMocks.restore.mockReset();
    sessionManagerMocks.clear.mockReset();
    csrfMocks.ensureCsrfCookie.mockReset();
    csrfMocks.getCsrfHeaderName.mockReset();
    csrfMocks.getCsrfTokenFromCookie.mockReset();

    sessionManagerMocks.restore.mockReturnValue({
      version: 1,
      sessionId: "active-session",
      userId: "user-1",
      role: "patient",
      createdAt: 1,
      lastActivityAt: 1,
    });
    csrfMocks.getCsrfHeaderName.mockReturnValue("x-csrf-token");
    csrfMocks.getCsrfTokenFromCookie.mockReturnValue("csrf-cookie");
    csrfMocks.ensureCsrfCookie.mockResolvedValue("csrf-cookie");
  });

  async function createClient() {
    vi.resetModules();
    const { attachInterceptors } = await import("@/services/api/interceptors");
    const client = axios.create();
    attachInterceptors(client);
    const mock = new MockAdapter(client);

    return { client, mock };
  }

  it("normalizes request methods and identifies CSRF-protected requests", async () => {
    vi.resetModules();
    const { normalizeRequestMethod, setCsrfHeader, shouldAttachCsrfHeader } = await import(
      "@/services/api/interceptors"
    );
    const headers: Record<string, string> = {};

    expect(normalizeRequestMethod(undefined)).toBe("GET");
    expect(normalizeRequestMethod("post")).toBe("POST");
    expect(shouldAttachCsrfHeader("POST", "/appointments")).toBe(true);
    expect(shouldAttachCsrfHeader("GET", "/appointments")).toBe(false);
    expect(shouldAttachCsrfHeader("HEAD", "/appointments")).toBe(false);
    expect(shouldAttachCsrfHeader("OPTIONS", "/appointments")).toBe(false);
    expect(shouldAttachCsrfHeader("POST", "/auth/csrf-token")).toBe(false);
    expect(shouldAttachCsrfHeader("POST", undefined)).toBe(true);

    setCsrfHeader(headers as any, undefined);
    expect(headers["x-csrf-token"]).toBeUndefined();

    setCsrfHeader(headers as any, "direct-csrf");
    expect(headers["x-csrf-token"]).toBe("direct-csrf");
  });

  it("adds the expected request headers and resolves CSRF for mutating requests", async () => {
    csrfMocks.getCsrfTokenFromCookie.mockReturnValue(null);
    csrfMocks.ensureCsrfCookie.mockResolvedValue("fresh-csrf-token");

    const { client, mock } = await createClient();

    mock.onPost("/appointments").reply((config) => {
      expect(config.withCredentials).toBe(true);
      expect(config.headers?.Accept).toBe("application/json");
      expect(config.headers?.["X-Requested-With"]).toBe("XMLHttpRequest");
      expect(config.headers?.["x-csrf-token"]).toBe("fresh-csrf-token");

      return [200, { ok: true }];
    });

    await client.post("/appointments", { officeId: "of-1" });

    expect(csrfMocks.ensureCsrfCookie).toHaveBeenCalledOnce();
  });

  it("refreshes the session and retries the original request after a 401", async () => {
    const { client, mock } = await createClient();
    let protectedCalls = 0;
    let refreshCalls = 0;

    mock.onGet("/protected").reply(() => {
      protectedCalls += 1;
      return protectedCalls === 1 ? [401] : [200, { ok: true }];
    });
    mock.onPost("/auth/refresh").reply(() => {
      refreshCalls += 1;
      return [200, { success: true }];
    });

    const response = await client.get("/protected");

    expect(response.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(sessionManagerMocks.clear).not.toHaveBeenCalled();
  });

  it("queues concurrent 401 responses behind a single refresh request", async () => {
    const { client, mock } = await createClient();
    const attempts = {
      first: 0,
      second: 0,
    };
    let refreshCalls = 0;

    mock.onGet("/first").reply(() => {
      attempts.first += 1;
      return attempts.first === 1 ? [401] : [200, { id: "first" }];
    });
    mock.onGet("/second").reply(() => {
      attempts.second += 1;
      return attempts.second === 1 ? [401] : [200, { id: "second" }];
    });
    mock.onPost("/auth/refresh").reply(
      () =>
        new Promise((resolve) => {
          refreshCalls += 1;
          setTimeout(() => resolve([200, { success: true }]), 10);
        }),
    );

    const [firstResponse, secondResponse] = await Promise.all([
      client.get("/first"),
      client.get("/second"),
    ]);

    expect(firstResponse.data).toEqual({ id: "first" });
    expect(secondResponse.data).toEqual({ id: "second" });
    expect(refreshCalls).toBe(1);
  });

  it("clears the local session when refresh fails", async () => {
    const { client, mock } = await createClient();

    mock.onGet("/protected").replyOnce(401);
    mock.onPost("/auth/refresh").replyOnce(401, {
      message: "Refresh vencido",
    });

    await expect(client.get("/protected")).rejects.toBeTruthy();

    expect(sessionManagerMocks.clear).toHaveBeenCalledOnce();
    expect(sessionChannelMocks.publish).toHaveBeenCalledWith({
      type: "session-cleared",
      sessionId: "active-session",
    });
  });

  it("clears the session if the retried request comes back as 401 again", async () => {
    const { client, mock } = await createClient();

    mock.onGet("/protected").replyOnce(401);
    mock.onPost("/auth/refresh").replyOnce(200, { success: true });
    mock.onGet("/protected").replyOnce(401);

    await expect(client.get("/protected")).rejects.toBeTruthy();

    expect(sessionManagerMocks.clear).toHaveBeenCalledOnce();
    expect(sessionChannelMocks.publish).toHaveBeenCalledWith({
      type: "session-cleared",
      sessionId: "active-session",
    });
  });

  it("does not try to refresh skipped or non-401 requests", async () => {
    const { client, mock } = await createClient();

    mock.onGet("/forbidden").replyOnce(403, { message: "No autorizado" });
    mock.onGet("/bootstrap").replyOnce(401, { message: "Sin sesion" });

    await expect(client.get("/forbidden")).rejects.toBeTruthy();
    await expect(
      client.get("/bootstrap", {
        skipSessionClear: true,
      } as any),
    ).rejects.toBeTruthy();

    expect(sessionManagerMocks.clear).not.toHaveBeenCalled();
  });

  it("skips CSRF for safe requests and CSRF bootstrap calls", async () => {
    const { client, mock } = await createClient();

    mock.onGet("/appointments").reply((config) => {
      expect(config.headers?.["x-csrf-token"]).toBeUndefined();
      return [200, { ok: true }];
    });
    mock.onPost("/auth/csrf-token").reply((config) => {
      expect(config.headers?.["x-csrf-token"]).toBeUndefined();
      return [200, { ok: true }];
    });

    await client.get("/appointments");
    await client.post("/auth/csrf-token");

    expect(csrfMocks.ensureCsrfCookie).not.toHaveBeenCalled();
  });

  it("does not add a CSRF header when no token can be resolved", async () => {
    csrfMocks.getCsrfTokenFromCookie.mockReturnValue(null);
    csrfMocks.ensureCsrfCookie.mockResolvedValue(null);

    const { client, mock } = await createClient();

    mock.onPost("/appointments").reply((config) => {
      expect(config.headers?.["x-csrf-token"]).toBeUndefined();
      return [200, { ok: true }];
    });

    await client.post("/appointments", {});
  });

  it("rejects queued requests when the shared refresh fails and there is no stored session", async () => {
    sessionManagerMocks.restore.mockReturnValue(null);
    const { client, mock } = await createClient();
    const attempts = {
      first: 0,
      second: 0,
    };

    mock.onGet("/first").reply(() => {
      attempts.first += 1;
      return [401];
    });
    mock.onGet("/second").reply(() => {
      attempts.second += 1;
      return [401];
    });
    mock.onPost("/auth/refresh").replyOnce(401, {
      message: "Refresh vencido",
    });

    await expect(
      Promise.all([client.get("/first"), client.get("/second")]),
    ).rejects.toBeTruthy();

    expect(sessionManagerMocks.clear).toHaveBeenCalled();
    expect(sessionChannelMocks.publish).not.toHaveBeenCalled();
  });
});
