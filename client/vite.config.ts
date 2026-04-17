import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import {
  CONTENT_SECURITY_POLICY,
  DEVELOPMENT_SECURITY_HEADERS,
  SECURITY_HEADERS,
} from "./src/shared/config/security";

function resolveExtraConnectOrigins(rawApiBaseUrl?: string) {
  if (!rawApiBaseUrl || !/^https?:\/\//i.test(rawApiBaseUrl.trim())) {
    return [];
  }

  try {
    return [new URL(rawApiBaseUrl).origin];
  } catch {
    return [];
  }
}

function buildContentSecurityPolicy(extraConnectOrigins: string[] = []) {
  if (extraConnectOrigins.length === 0) {
    return CONTENT_SECURITY_POLICY;
  }

  const uniqueOrigins = extraConnectOrigins.filter(
    (origin, index) => extraConnectOrigins.indexOf(origin) === index,
  );
  const connectSrc = `connect-src 'self' ws: wss: ${uniqueOrigins.join(" ")}`;

  return CONTENT_SECURITY_POLICY.replace("connect-src 'self' ws: wss:", connectSrc);
}

function injectSecurityMetaTags(contentSecurityPolicy: string): Plugin {
  const content = contentSecurityPolicy.replace(/"/g, "&quot;");

  return {
    name: "docly-security-meta",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<meta charset=\"UTF-8\" />",
        `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${content}" />
    <meta name="referrer" content="no-referrer" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const contentSecurityPolicy = buildContentSecurityPolicy(
    resolveExtraConnectOrigins(env.VITE_API_BASE_URL),
  );

  return {
    plugins: [react(), injectSecurityMetaTags(contentSecurityPolicy)],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
    server: {
      headers: DEVELOPMENT_SECURITY_HEADERS,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Security-Policy": contentSecurityPolicy,
      },
    },
  };
});
