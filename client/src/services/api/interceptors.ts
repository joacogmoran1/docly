import type { AxiosInstance } from "axios";
import { sessionChannel } from "@/services/auth/session-channel";
import { sessionManager } from "@/services/auth/session-manager";

export function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    config.headers.Accept = "application/json";
    config.headers["X-Requested-With"] = "XMLHttpRequest";
    config.withCredentials = true;

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const requestConfig = error?.config as { skipSessionClear?: boolean } | undefined;

      if (error?.response?.status === 401 && !requestConfig?.skipSessionClear) {
        const activeSession = sessionManager.restore();
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
