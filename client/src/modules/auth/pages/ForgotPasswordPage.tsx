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
      await requestPasswordReset(values);
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
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
          La API documentada todavia no incluye recuperacion de contrasena, asi que esta vista queda informativa.
        </p>
      </div>

      <form className="stack-md" onSubmit={onSubmit}>
        <Input
          label="Email"
          placeholder="nombre@correo.com"
          error={errors.email?.message}
          {...register("email")}
        />
        {submitted ? (
          <div className="panel">
            <strong>Revisa tu correo</strong>
            <p className="meta">
              Si en el futuro el backend expone este flujo, desde aca podremos conectarlo.
            </p>
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
