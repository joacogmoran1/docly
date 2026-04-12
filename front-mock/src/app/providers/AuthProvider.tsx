import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login as loginRequest } from "@/modules/auth/api/auth.api";
import { getSessionUserById } from "@/mocks/docly-api";
import type { LoginFormValues } from "@/modules/auth/types/auth-forms";
import type { SessionState, SessionUser } from "@/shared/types/auth";
import { sessionChannel } from "@/services/auth/session-channel";
import { sessionManager } from "@/services/auth/session-manager";
import { tokenStorage } from "@/services/auth/token-storage";
import { logger } from "@/services/monitoring/logger";

interface AuthContextValue extends SessionState {
  isBootstrapping: boolean;
  login: (values: LoginFormValues) => Promise<SessionUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const restored = sessionManager.restore();
        if (!restored) return;

        const restoredUser = await getSessionUserById(restored.userId, restored.role);
        if (restoredUser && active) {
          setUser(restoredUser);
          setSessionId(restored.sessionId);
        }

        if (!restoredUser) {
          sessionManager.clear();
        }
      } catch (error) {
        logger.error("No se pudo restaurar la sesion", error);
        sessionManager.clear();
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = sessionChannel.subscribe((event) => {
      if (!sessionId || event.sessionId === sessionId) return;

      tokenStorage.clear();
      sessionManager.clear();
      setSessionId(null);
      setUser(null);
    });

    return unsubscribe;
  }, [sessionId]);

  useEffect(() => {
    if (!user || !sessionId) return;

    const verifySession = () => {
      const activeSession = sessionManager.restore();
      if (!activeSession || activeSession.sessionId !== sessionId) {
        tokenStorage.clear();
        sessionManager.clear();
        setSessionId(null);
        setUser(null);
      }
    };

    const touchSession = () => {
      if (document.visibilityState === "hidden") return;
      verifySession();
    };

    const interval = window.setInterval(verifySession, 60_000);

    window.addEventListener("focus", touchSession);
    window.addEventListener("pointerdown", touchSession);
    window.addEventListener("keydown", touchSession);
    document.addEventListener("visibilitychange", touchSession);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", touchSession);
      window.removeEventListener("pointerdown", touchSession);
      window.removeEventListener("keydown", touchSession);
      document.removeEventListener("visibilitychange", touchSession);
    };
  }, [sessionId, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      async login(values) {
        const response = await loginRequest(values);
        tokenStorage.set(response.tokens);

        const persistedSession = sessionManager.persist({
          userId: response.user.id,
          role: response.user.role,
          expiresAt: response.tokens.expiresAt,
        });

        sessionChannel.publish({
          type: "session-replaced",
          sessionId: persistedSession.sessionId,
        });

        setSessionId(persistedSession.sessionId);
        setUser(response.user);
        return response.user;
      },
      logout() {
        const activeSessionId = sessionId;
        tokenStorage.clear();
        sessionManager.clear();
        setSessionId(null);
        setUser(null);

        if (activeSessionId) {
          sessionChannel.publish({
            type: "session-cleared",
            sessionId: activeSessionId,
          });
        }
      },
    }),
    [isBootstrapping, sessionId, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }

  return context;
}
