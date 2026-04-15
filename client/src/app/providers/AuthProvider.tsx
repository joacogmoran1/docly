import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCurrentSessionUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/modules/auth/api/auth.api";
import type {
  LoginFormValues,
  RegisterFormValues,
} from "@/modules/auth/types/auth-forms";
import type { SessionState, SessionUser } from "@/shared/types/auth";
import { sessionChannel } from "@/services/auth/session-channel";
import { sessionManager } from "@/services/auth/session-manager";

interface AuthContextValue extends SessionState {
  isBootstrapping: boolean;
  login: (values: LoginFormValues) => Promise<SessionUser>;
  register: (values: RegisterFormValues) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<SessionUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const restoredUser = await getCurrentSessionUser();
        const restoredSession =
          sessionManager.restore() ??
          sessionManager.persist({
            userId: restoredUser.id,
            role: restoredUser.role,
          });

        if (active) {
          setUser(restoredUser);
          setSessionId(restoredSession.sessionId);
        }
      } catch {
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

      void queryClient.clear();
      sessionManager.clear();
      setSessionId(null);
      setUser(null);
    });

    return unsubscribe;
  }, [queryClient, sessionId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      async login(values) {
        const nextUser = await loginRequest(values);
        await queryClient.clear();

        const persistedSession = sessionManager.persist({
          userId: nextUser.id,
          role: nextUser.role,
        });

        sessionChannel.publish({
          type: "session-replaced",
          sessionId: persistedSession.sessionId,
        });

        setSessionId(persistedSession.sessionId);
        setUser(nextUser);
        return nextUser;
      },
      async register(values) {
        const nextUser = await registerRequest(values);
        await queryClient.clear();

        const persistedSession = sessionManager.persist({
          userId: nextUser.id,
          role: nextUser.role,
        });

        sessionChannel.publish({
          type: "session-replaced",
          sessionId: persistedSession.sessionId,
        });

        setSessionId(persistedSession.sessionId);
        setUser(nextUser);
        return nextUser;
      },
      async logout() {
        const activeSessionId = sessionId;

        try {
          await logoutRequest();
        } finally {
          await queryClient.clear();
          sessionManager.clear();
          setSessionId(null);
          setUser(null);

          if (activeSessionId) {
            sessionChannel.publish({
              type: "session-cleared",
              sessionId: activeSessionId,
            });
          }
        }
      },
      async refreshSession() {
        try {
          const restoredUser = await getCurrentSessionUser();
          setUser(restoredUser);
          return restoredUser;
        } catch {
          return null;
        }
      },
    }),
    [isBootstrapping, queryClient, sessionId, user],
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
