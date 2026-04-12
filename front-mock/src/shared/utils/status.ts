export function getBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("confirm") ||
    normalized.includes("activo") ||
    normalized.includes("disponible")
  ) {
    return "success";
  }

  if (normalized.includes("pend")) {
    return "warning";
  }

  if (normalized.includes("cancel") || normalized.includes("venc") || normalized.includes("bloque")) {
    return "danger";
  }

  return "info";
}
