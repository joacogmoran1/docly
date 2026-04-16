import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { loginSchema } from "@/modules/auth/schemas/login.schema";
import type { LoginFormValues } from "@/modules/auth/types/auth-forms";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const user = await login(values);
      navigate(user.role === "patient" ? "/patient" : "/professional", {
        replace: true,
      });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    }
  });

  return (
    <div className="auth-card stack-lg">
      <div className="auth-card-header">
        <span className="eyebrow">Docly</span>
        <h1 className="title-lg">Bienvenido de nuevo</h1>
        <p className="meta">
          No tenes cuenta? <Link to="/auth/register">Crear cuenta</Link>
        </p>
      </div>

      <form className="stack-md" onSubmit={onSubmit}>
        <Input
          label="Email"
          placeholder="nombre@correo.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Contrasena"
          placeholder="Ingresa tu contrasena"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError ? <span className="field-error">{serverError}</span> : null}
        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>

      <div className="auth-card-links">
        <Link to="/auth/forgot-password" className="helper-text">
          Recuperar contrasena
        </Link>
      </div>
    </div>
  );
}
