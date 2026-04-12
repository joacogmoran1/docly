const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeSingleLineInput(value: string, maxLength = 255) {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultilineInput(value: string, maxLength = 4000) {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmailInput(value: string) {
  return sanitizeSingleLineInput(value, 254).toLowerCase();
}

export function sanitizeSearchInput(value: string, maxLength = 80) {
  return sanitizeSingleLineInput(value, maxLength);
}

export function sanitizeInternalPath(
  value: string | null | undefined,
  fallback = "/",
) {
  if (!value) return fallback;

  const sanitized = value.replace(CONTROL_CHARS, "").trim();

  if (!sanitized.startsWith("/")) return fallback;
  if (sanitized.startsWith("//")) return fallback;
  if (sanitized.includes("://")) return fallback;

  return sanitized;
}
