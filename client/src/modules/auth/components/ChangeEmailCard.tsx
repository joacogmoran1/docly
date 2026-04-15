import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/app/providers/AuthProvider";
import { changeEmail } from "@/modules/auth/api/auth.api";
import { changeEmailSchema } from "@/modules/auth/schemas/login.schema";
import type { ChangeEmailFormValues } from "@/modules/auth/types/auth-forms";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";

export function ChangeEmailCard() {
  const { user, refreshSession } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      email: user?.email ?? "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const message = await changeEmail(values);
      await refreshSession();
      setSuccessMessage(message);
      reset({
        email: values.email,
        password: "",
      });
    } catch (error) {
      setSuccessMessage(null);
      setServerError(error instanceof Error ? error.message : "No se pudo cambiar el mail.");
    }
  });

  return (
    <Card
      title="Mail de acceso"
      description="Actualiza el mail de tu cuenta validando con tu contrasena actual."
      className="panel-separated"
    >
      <form className="minimal-form" onSubmit={onSubmit}>
        <Input
          label="Nuevo mail"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Contrasena actual"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />
        {successMessage ? <span className="helper-text">{successMessage}</span> : null}
        {serverError ? <span className="field-error">{serverError}</span> : null}
        <div className="form-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar mail"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
