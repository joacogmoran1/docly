import { z } from "zod";
import {
  sanitizeMultilineInput,
  sanitizeSingleLineInput,
} from "@/shared/utils/sanitize";

const sanitizedSingleLine = (minLength: number, message: string, maxLength = 180) =>
  z.preprocess(
    (value) =>
      typeof value === "string" ? sanitizeSingleLineInput(value, maxLength) : value,
    z.string().min(minLength, message),
  );

const sanitizedMultiline = (minLength: number, message: string, maxLength = 2500) =>
  z.preprocess(
    (value) =>
      typeof value === "string" ? sanitizeMultilineInput(value, maxLength) : value,
    z.string().min(minLength, message),
  );

const optionalSanitizedMultiline = (minLength: number, message: string, maxLength = 2500) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;

      const sanitized = sanitizeMultilineInput(value, maxLength);
      return sanitized.length ? sanitized : undefined;
    },
    z.string().min(minLength, message).optional(),
  );

export const consultationSchema = z.object({
  reason: sanitizedSingleLine(4, "Ingresa el motivo de consulta."),
  assessment: sanitizedMultiline(4, "Ingresa un analisis clinico."),
  indications: sanitizedMultiline(4, "Ingresa indicaciones."),
  evolution: optionalSanitizedMultiline(4, "Ingresa evolucion."),
  nextControl: sanitizedSingleLine(1, "Indica proximo control.", 120),
});

export type ConsultationFormValues = z.infer<typeof consultationSchema>;
