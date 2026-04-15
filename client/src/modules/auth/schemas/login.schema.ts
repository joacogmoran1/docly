import { z } from "zod";
import {
  sanitizeEmailInput,
  sanitizeSingleLineInput,
} from "@/shared/utils/sanitize";

const sanitizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? sanitizeEmailInput(value) : value),
  z.string().email("Ingresa un email valido."),
);

const sanitizedText = (minLength: number, message: string, maxLength = 120) =>
  z.preprocess(
    (value) =>
      typeof value === "string" ? sanitizeSingleLineInput(value, maxLength) : value,
    z.string().min(minLength, message),
  );

const sanitizedOptionalText = (maxLength = 120) =>
  z.preprocess(
    (value) =>
      typeof value === "string" ? sanitizeSingleLineInput(value, maxLength) : value,
    z.string().optional(),
  );

export const loginSchema = z.object({
  email: sanitizedEmail,
  password: sanitizedText(
    6,
    "La contrasena debe tener al menos 6 caracteres.",
    128,
  ),
  role: z.enum(["patient", "professional"]).optional(),
});

export const forgotPasswordSchema = z.object({
  email: sanitizedEmail,
});

export const resetPasswordSchema = z
  .object({
    password: sanitizedText(
      8,
      "La contrasena debe tener al menos 8 caracteres.",
      128,
    ),
    confirmPassword: sanitizedText(8, "Confirma la contrasena.", 128),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contrasenas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: sanitizedText(
      6,
      "Ingresa tu contrasena actual.",
      128,
    ),
    newPassword: sanitizedText(
      8,
      "La nueva contrasena debe tener al menos 8 caracteres.",
      128,
    ),
    confirmPassword: sanitizedText(8, "Confirma la nueva contrasena.", 128),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contrasenas no coinciden.",
        path: ["confirmPassword"],
      });
    }

    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La nueva contrasena debe ser distinta de la actual.",
        path: ["newPassword"],
      });
    }
  });

export const changeEmailSchema = z.object({
  email: sanitizedEmail,
  password: sanitizedText(6, "Ingresa tu contrasena actual.", 128),
});

export const registerSchema = z
  .object({
    role: z.enum(["patient", "professional"]),
    firstName: sanitizedText(2, "Ingresa tu nombre.", 60),
    lastName: sanitizedText(2, "Ingresa tu apellido.", 60),
    email: sanitizedEmail,
    phone: sanitizedOptionalText(40),
    document: sanitizedOptionalText(40),
    specialty: sanitizedOptionalText(80),
    license: sanitizedOptionalText(40),
    password: sanitizedText(
      8,
      "La contrasena debe tener al menos 8 caracteres.",
      128,
    ),
    confirmPassword: sanitizedText(8, "Confirma la contrasena.", 128),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: "Necesitas aceptar los terminos.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.role === "professional" && !data.specialty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa tu especialidad.",
        path: ["specialty"],
      });
    }

    if (data.role === "professional" && !data.license) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa tu matricula.",
        path: ["license"],
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contrasenas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  });
