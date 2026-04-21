import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/app/providers/AuthProvider";
import { createSessionUser } from "@/test/factories/auth";

const authApiMocks = vi.hoisted(() => ({
  getCurrentSessionUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

const sessionChannelMocks = vi.hoisted(() => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
}));

const sessionManagerMocks = vi.hoisted(() => ({
  clear: vi.fn(),
  persist: vi.fn(),
  restore: vi.fn(),
}));

vi.mock("@/modules/auth/api/auth.api", () => authApiMocks);
vi.mock("@/services/auth/session-channel", () => ({
  sessionChannel: sessionChannelMocks,
}));
vi.mock("@/services/auth/session-manager", () => ({
  sessionManager: sessionManagerMocks,
}));

let sessionSubscription:
  | ((event: { type: string; sessionId: string }) => void)
  | undefined;

function AuthProbe() {
  const auth = useAuth();
  const [refreshResult, setRefreshResult] = useState("idle");

  return (
    <div>
      <span data-testid="auth-bootstrapping">{String(auth.isBootstrapping)}</span>
      <span data-testid="auth-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="auth-user">{auth.user?.fullName ?? "anonymous"}</span>
      <span data-testid="auth-refresh-result">{refreshResult}</span>
      <button
        type="button"
        onClick={() =>
          auth.login({
            email: "doctor@docly.app",
            password: "password",
          })
        }
      >
        Ejecutar login
      </button>
      <button
        type="button"
        onClick={() =>
          auth.register({
            firstName: "Nuevo",
            lastName: "Usuario",
            email: "nuevo@docly.app",
            phone: "+54 11 5555 1234",
            password: "password",
            confirmPassword: "password",
            role: "patient",
            acceptedTerms: true,
          })
        }
      >
        Ejecutar registro
      </button>
      <button type="button" onClick={() => auth.logout()}>
        Ejecutar logout
      </button>
      <button
        type="button"
        onClick={async () => {
          const refreshed = await auth.refreshSession();
          setRefreshResult(refreshed?.fullName ?? "null");
        }}
      >
        Refrescar sesion
      </button>
    </div>
  );
}

function renderAuthProvider() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    authApiMocks.getCurrentSessionUser.mockReset();
    authApiMocks.login.mockReset();
    authApiMocks.logout.mockReset();
    authApiMocks.register.mockReset();
    sessionChannelMocks.publish.mockReset();
    sessionChannelMocks.subscribe.mockReset();
    sessionManagerMocks.clear.mockReset();
    sessionManagerMocks.persist.mockReset();
    sessionManagerMocks.restore.mockReset();

    sessionSubscription = undefined;
    sessionChannelMocks.subscribe.mockImplementation((callback) => {
      sessionSubscription = callback;
      return () => undefined;
    });
  });

  it("bootstraps the user and persists a session when there is no restored session", async () => {
    const patientUser = createSessionUser({
      role: "patient",
      id: "patient-user-77",
    });

    authApiMocks.getCurrentSessionUser.mockResolvedValue(patientUser);
    sessionManagerMocks.restore.mockReturnValue(null);
    sessionManagerMocks.persist.mockReturnValue({
      version: 1,
      sessionId: "bootstrap-session",
      userId: patientUser.id,
      role: patientUser.role,
      createdAt: 100,
      lastActivityAt: 100,
    });

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("auth-user")).toHaveTextContent("Paciente Demo");
    expect(sessionManagerMocks.persist).toHaveBeenCalledWith({
      userId: patientUser.id,
      role: patientUser.role,
    });
  });

  it("persists and publishes a new session on login", async () => {
    const nextUser = createSessionUser({
      role: "professional",
      id: "professional-user-88",
    });

    authApiMocks.getCurrentSessionUser.mockRejectedValue(new Error("Sin sesion"));
    authApiMocks.login.mockResolvedValue(nextUser);
    sessionManagerMocks.persist.mockReturnValue({
      version: 1,
      sessionId: "login-session",
      userId: nextUser.id,
      role: nextUser.role,
      createdAt: 200,
      lastActivityAt: 200,
    });

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-bootstrapping")).toHaveTextContent("false");
    });

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar login" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-user")).toHaveTextContent("Profesional Demo");
    });

    expect(sessionManagerMocks.persist).toHaveBeenCalledWith({
      userId: nextUser.id,
      role: nextUser.role,
    });
    expect(sessionChannelMocks.publish).toHaveBeenCalledWith({
      type: "session-replaced",
      sessionId: "login-session",
    });
  });

  it("clears and broadcasts the session on logout", async () => {
    const activeUser = createSessionUser({
      role: "patient",
      id: "patient-user-99",
    });

    authApiMocks.getCurrentSessionUser.mockResolvedValue(activeUser);
    authApiMocks.logout.mockResolvedValue(undefined);
    sessionManagerMocks.restore.mockReturnValue({
      version: 1,
      sessionId: "active-session",
      userId: activeUser.id,
      role: activeUser.role,
      createdAt: 100,
      lastActivityAt: 100,
    });

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("true");
    });

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("false");
    });

    expect(sessionManagerMocks.clear).toHaveBeenCalled();
    expect(sessionChannelMocks.publish).toHaveBeenCalledWith({
      type: "session-cleared",
      sessionId: "active-session",
    });
  });

  it("reuses restored sessions, reacts to foreign session events, and refreshes the current user", async () => {
    const restoredUser = createSessionUser({
      role: "professional",
      id: "professional-user-restore",
    });
    const refreshedUser = {
      ...restoredUser,
      fullName: "Profesional Actualizado",
      firstName: "Profesional",
      lastName: "Actualizado",
    };

    sessionManagerMocks.restore.mockReturnValue({
      version: 1,
      sessionId: "restored-session",
      userId: restoredUser.id,
      role: restoredUser.role,
      createdAt: 10,
      lastActivityAt: 10,
    });
    authApiMocks.getCurrentSessionUser.mockResolvedValue(restoredUser);

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-user")).toHaveTextContent("Profesional Demo");
    });

    expect(sessionManagerMocks.persist).not.toHaveBeenCalled();

    sessionSubscription?.({
      type: "session-replaced",
      sessionId: "restored-session",
    });

    expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("true");

    sessionSubscription?.({
      type: "session-cleared",
      sessionId: "foreign-session",
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("false");
    });

    expect(sessionManagerMocks.clear).toHaveBeenCalled();

    authApiMocks.getCurrentSessionUser.mockResolvedValueOnce(refreshedUser);
    await userEvent.click(screen.getByRole("button", { name: "Refrescar sesion" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-refresh-result")).toHaveTextContent(
        "Profesional Actualizado",
      );
    });
  });

  it("registers a user and returns null when refresh fails", async () => {
    const nextUser = createSessionUser({
      role: "patient",
      id: "patient-user-registered",
      firstName: "Paciente",
      lastName: "Nuevo",
    });

    authApiMocks.getCurrentSessionUser.mockRejectedValue(new Error("Sin sesion"));
    authApiMocks.register.mockResolvedValue(nextUser);
    sessionManagerMocks.persist.mockReturnValue({
      version: 1,
      sessionId: "register-session",
      userId: nextUser.id,
      role: nextUser.role,
      createdAt: 300,
      lastActivityAt: 300,
    });

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-bootstrapping")).toHaveTextContent("false");
    });

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar registro" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-authenticated")).toHaveTextContent("true");
    });

    authApiMocks.getCurrentSessionUser.mockRejectedValueOnce(new Error("Sin sesion"));

    await userEvent.click(screen.getByRole("button", { name: "Refrescar sesion" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-refresh-result")).toHaveTextContent("null");
    });
  });

  it("logs out without broadcasting when there is no active session id", async () => {
    authApiMocks.getCurrentSessionUser.mockRejectedValue(new Error("Sin sesion"));
    authApiMocks.logout.mockResolvedValue(undefined);

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-bootstrapping")).toHaveTextContent("false");
    });

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar logout" }));

    expect(sessionManagerMocks.clear).toHaveBeenCalled();
    expect(sessionChannelMocks.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "session-cleared" }),
    );
  });

  it("does not set bootstrap state after unmounting mid-restore", async () => {
    let resolveSession: ((value: ReturnType<typeof createSessionUser>) => void) | undefined;

    authApiMocks.getCurrentSessionUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );

    const { unmount } = renderAuthProvider();
    unmount();

    resolveSession?.(createSessionUser());

    await Promise.resolve();

    expect(sessionManagerMocks.clear).not.toHaveBeenCalled();
  });

  it("throws when useAuth is rendered outside the provider", async () => {
    vi.resetModules();
    vi.doMock("react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("react")>();
      return {
        ...actual,
        useContext: () => null,
      };
    });

    try {
      const { useAuth: isolatedUseAuth } = await import("@/app/providers/AuthProvider");

      expect(() => isolatedUseAuth()).toThrow("useAuth debe utilizarse dentro de AuthProvider.");
    } finally {
      vi.doUnmock("react");
    }
  });
});
