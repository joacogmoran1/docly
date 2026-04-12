import type { AxiosInstance } from "axios";
import { sessionChannel } from "@/services/auth/session-channel";
import { tokenStorage } from "@/services/auth/token-storage";
import { sessionManager } from "@/services/auth/session-manager";

export function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    const tokens = tokenStorage.get();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    config.headers.Accept = "application/json";
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error?.response?.status === 401) {
        const activeSession = sessionManager.restore();
        tokenStorage.clear();
        sessionManager.clear();
        if (activeSession) {
          sessionChannel.publish({
            type: "session-cleared",
            sessionId: activeSession.sessionId,
          });
        }
      }

      return Promise.reject(error);
    },
  );
}
