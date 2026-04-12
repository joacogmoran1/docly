function shouldLog() {
  return Boolean(import.meta.env.DEV);
}

function sanitizeMeta(meta?: unknown) {
  if (!meta) return undefined;

  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
    };
  }

  if (typeof meta === "string") {
    return meta.slice(0, 200);
  }

  return undefined;
}

export const logger = {
  info(message: string, meta?: unknown) {
    if (!shouldLog()) return;
    console.info(`[Docly] ${message}`, sanitizeMeta(meta) ?? "");
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog()) return;
    console.warn(`[Docly] ${message}`, sanitizeMeta(meta) ?? "");
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog()) return;
    console.error(`[Docly] ${message}`, sanitizeMeta(meta) ?? "");
  },
};
