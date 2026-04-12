import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useState } from "react";
import { forgotPasswordSchema } from "@/modules/auth/schemas/login.schema";
import type { ForgotPasswordFormValues } from "@/modules/auth/types/auth-forms";
import { requestPasswordReset } from "@/modules/auth/api/auth.api";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const response = await requestPasswordReset(values);
      setMessage(response.message);
      setResetLink(response.resetLink ?? null);
      setResetToken(response.resetToken ?? null);
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      setMessage(null);
      setResetLink(null);
      setResetToken(null);
      setServerError(
        error instanceof Error ? error.message : "No se pudo iniciar la recuperacion.",
      );
    }
  });

  return (
    <div className="auth-card stack-lg">
      <div className="stack-sm">
        <span className="eyebrow">Recuperacion segura</span>
        <h1 className="title-lg">Restablece tu contrasena</h1>
        <p className="meta">
          Ingresa tu email y el backend generara un enlace de recuperacion.
        </p>
      </div>

      <form className="stack-md" onSubmit={onSubmit}>
        <Input
          label="Email"
          placeholder="nombre@correo.com"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        {submitted ? (
          <div className="panel">
            <strong>Revisa tu correo</strong>
            <p className="meta">{message}</p>
            {resetLink ? (
              <a href={resetLink} className="helper-text">
                Abrir enlace de reseteo
              </a>
            ) : null}
            {resetToken ? (
              <span className="helper-text">Token de desarrollo: {resetToken}</span>
            ) : null}
          </div>
        ) : null}
        {serverError ? <span className="field-error">{serverError}</span> : null}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar enlace"}
        </Button>
      </form>

      <Link to="/auth/login" className="helper-text">
        Volver al login
      </Link>
    </div>
  );
}
