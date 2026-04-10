import { PDF_UPLOAD_MAX_BYTES } from "@/shared/config/security";

export function validatePdfUpload(file: File | null | undefined) {
  if (!file) return "Selecciona un archivo PDF.";

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

  if (!isPdf) {
    return "Solo se permiten archivos PDF.";
  }

  if (file.size > PDF_UPLOAD_MAX_BYTES) {
    return "El PDF supera el limite permitido de 5 MB.";
  }

  return null;
}
