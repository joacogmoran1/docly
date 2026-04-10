const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatNumericDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  }).format(new Date(value));
}

export function formatNumericTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatRelativeDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const diffMs = target.getTime() - current.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";

  return shortDateFormatter.format(date);
}
