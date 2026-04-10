import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import {
  CONTENT_SECURITY_POLICY,
  DEVELOPMENT_SECURITY_HEADERS,
  SECURITY_HEADERS,
} from "./src/shared/config/security";

function injectSecurityMetaTags(): Plugin {
  const content = CONTENT_SECURITY_POLICY.replace(/"/g, "&quot;");

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

export default defineConfig({
  plugins: [react(), injectSecurityMetaTags()],
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
    headers: SECURITY_HEADERS,
  },
});
