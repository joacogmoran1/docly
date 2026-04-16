import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { sessionChannel } from "@/services/auth/session-channel";
import { sessionManager } from "@/services/auth/session-manager";

// ── Refresh token queue ─────────────────────────────────────────────────
// Previene múltiples refresh simultáneos cuando varias requests fallan con 401.
// Solo la primera dispara el refresh; las demás esperan el resultado.

let isRefreshing = false;
let refreshQueue: Array<{
	resolve: () => void;
	reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown | null) {
	refreshQueue.forEach((pending) => {
		if (error) {
			pending.reject(error);
		} else {
			pending.resolve();
		}
	});
	refreshQueue = [];
}

// ── Custom config flags ─────────────────────────────────────────────────

interface CustomRequestConfig extends InternalAxiosRequestConfig {
	/** No intentar refresh ni limpiar sesión en 401 (usado por /profile bootstrap) */
	skipSessionClear?: boolean;
	/** Marca interna: esta request ya es un retry post-refresh */
	_isRetry?: boolean;
}

// ── Interceptors ────────────────────────────────────────────────────────

export function attachInterceptors(client: AxiosInstance) {
	// ── Request interceptor ──
	client.interceptors.request.use((config) => {
		config.headers.Accept = "application/json";
		config.headers["X-Requested-With"] = "XMLHttpRequest";
		config.withCredentials = true;

		return config;
	});

	// ── Response interceptor ──
	client.interceptors.response.use(
		(response) => response,
		async (error) => {
			const requestConfig = error?.config as CustomRequestConfig | undefined;
			const status = error?.response?.status;

			// Solo interceptar 401
			if (status !== 401 || !requestConfig) {
				return Promise.reject(error);
			}

			// No refrescar si la request lo pide explícitamente (bootstrap de sesión)
			if (requestConfig.skipSessionClear) {
				return Promise.reject(error);
			}

			// No refrescar si ya es un retry (evitar loop infinito)
			if (requestConfig._isRetry) {
				clearSession();
				return Promise.reject(error);
			}

			// ── Intentar refresh ──

			// Si ya hay un refresh en curso, encolarse
			if (isRefreshing) {
				return new Promise<void>((resolve, reject) => {
					refreshQueue.push({ resolve, reject });
				})
					.then(() => {
						requestConfig._isRetry = true;
						return client(requestConfig);
					})
					.catch((queueError) => {
						return Promise.reject(queueError);
					});
			}

			isRefreshing = true;

			try {
				// Llamar al endpoint de refresh.
				// El browser envía automáticamente la cookie refresh_token (path /api/auth).
				await client.post("/auth/refresh", null, {
					_isRetry: true,
					skipSessionClear: true,
				} as CustomRequestConfig);

				// Refresh exitoso — el servidor seteó nuevas cookies.
				processQueue(null);

				// Reintentar la request original
				requestConfig._isRetry = true;
				return client(requestConfig);
			} catch (refreshError) {
				// Refresh falló — sesión inválida
				processQueue(refreshError);
				clearSession();
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		},
	);
}

// ── Helper: limpiar sesión local ──

function clearSession() {
	const activeSession = sessionManager.restore();
	sessionManager.clear();

	if (activeSession) {
		sessionChannel.publish({
			type: "session-cleared",
			sessionId: activeSession.sessionId,
		});
	}
}
