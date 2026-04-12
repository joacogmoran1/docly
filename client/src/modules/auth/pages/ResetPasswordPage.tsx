import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/modules/auth/api/auth.api";
import { resetPasswordSchema } from "@/modules/auth/schemas/login.schema";
import type { ResetPasswordFormValues } from "@/modules/auth/types/auth-forms";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const message = await resetPassword(token, values);
      setSuccessMessage(message);
    } catch (error) {
      setSuccessMessage(null);
      setServerError(
        error instanceof Error ? error.message : "No se pudo restablecer la contrasena.",
      );
    }
  });

  return (
    <div className="auth-card stack-lg">
      <div className="stack-sm">
        <span className="eyebrow">Acceso seguro</span>
        <h1 className="title-lg">Crear una nueva contrasena</h1>
        <p className="meta">
          Usa el enlace que recibiste para definir una contrasena nueva.
        </p>
      </div>

      {!token ? (
        <div className="panel">
          <strong>Falta el token</strong>
          <p className="meta">
            Abre el enlace de recuperacion completo o solicita uno nuevo.
          </p>
        </div>
      ) : (
        <form className="stack-md" onSubmit={onSubmit}>
          <Input
            label="Nueva contrasena"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirmar contrasena"
            type="password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {successMessage ? (
            <div className="panel">
              <strong>Contrasena actualizada</strong>
              <p className="meta">{successMessage}</p>
            </div>
          ) : null}
          {serverError ? <span className="field-error">{serverError}</span> : null}
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Guardar nueva contrasena"}
          </Button>
        </form>
      )}

      <Link to="/auth/login" className="helper-text">
        Volver al login
      </Link>
    </div>
  );
}
