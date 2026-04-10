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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "sofia@docly.app" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await requestPasswordReset(values);
    setSubmitted(true);
  });

  return (
    <div className="auth-card stack-lg">
      <div className="stack-sm">
        <span className="eyebrow">Recuperación segura</span>
        <h1 className="title-lg">Restablecé tu contraseña</h1>
        <p className="meta">
          Te enviaremos un enlace temporal para continuar el proceso de forma segura.
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
            <strong>Revisá tu correo</strong>
            <p className="meta">
              Si existe una cuenta asociada, enviamos instrucciones para restablecer el acceso.
            </p>
          </div>
        ) : null}
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
