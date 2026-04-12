import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { changePassword } from "@/modules/auth/api/auth.api";
import { changePasswordSchema } from "@/modules/auth/schemas/login.schema";
import type { ChangePasswordFormValues } from "@/modules/auth/types/auth-forms";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";

export function ChangePasswordCard() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const message = await changePassword(values);
      setSuccessMessage(message);
      reset();
    } catch (error) {
      setSuccessMessage(null);
      setServerError(
        error instanceof Error ? error.message : "No se pudo cambiar la contrasena.",
      );
    }
  });

  return (
    <Card
      title="Seguridad"
      description="Actualiza la contrasena de tu cuenta desde el frontend conectado al backend."
      className="panel-separated"
    >
      <form className="minimal-form" onSubmit={onSubmit}>
        <Input
          label="Contrasena actual"
          type="password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <Input
          label="Nueva contrasena"
          type="password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirmar nueva contrasena"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {successMessage ? <span className="helper-text">{successMessage}</span> : null}
        {serverError ? <span className="field-error">{serverError}</span> : null}
        <div className="form-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Cambiar contrasena"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
