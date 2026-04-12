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

export const consultationSchema = z.object({
  reason: sanitizedSingleLine(4, "Ingresa el motivo de consulta."),
  assessment: sanitizedMultiline(4, "Ingresa un analisis clinico."),
  indications: sanitizedMultiline(4, "Ingresa indicaciones."),
  evolution: sanitizedMultiline(4, "Ingresa evolucion."),
  nextControl: sanitizedSingleLine(1, "Indica proximo control.", 120),
  attachments: z
    .preprocess(
      (value) =>
        typeof value === "string" ? sanitizeSingleLineInput(value, 255) : value,
      z.string().optional(),
    ),
});

export type ConsultationFormValues = z.infer<typeof consultationSchema>;
