import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { registerSchema } from "@/modules/auth/schemas/login.schema";
import type { RegisterFormValues } from "@/modules/auth/types/auth-forms";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";

const steps = ["Cuenta", "Datos", "Seguridad"];

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(0);
  const [createdRole, setCreatedRole] = useState<"patient" | "professional" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "patient",
      fullName: "",
      email: "",
      phone: "",
      document: "",
      specialty: "",
      license: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  const role = watch("role");

  const currentFields = useMemo(() => {
    if (step === 0) return ["role", "fullName", "email"] as const;
    if (step === 1) {
      return role === "professional"
        ? (["phone", "document", "specialty", "license"] as const)
        : (["phone", "document"] as const);
    }
    return ["password", "confirmPassword", "acceptedTerms"] as const;
  }, [role, step]);

  const submitRegistration = handleSubmit(async (values) => {
    try {
      setServerError(null);
      const user = await registerUser(values);
      setCreatedRole(user.role);
      setStep(3);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    }
  });

  const goNext = async () => {
    const valid = await trigger(currentFields);
    if (!valid) return;

    setServerError(null);

    if (step === steps.length - 1) {
      await submitRegistration();
      return;
    }

    setStep((current) => current + 1);
  };

  return (
    <div className="auth-card stack-lg">
      <div className="auth-card-header">
        <span className="eyebrow">Alta segura</span>
        <h1 className="title-lg">Crea tu cuenta</h1>
        <p className="meta">
          Ya tenes cuenta? <Link to="/auth/login">Iniciar sesion</Link>
        </p>
      </div>

      <div className="stepper auth-stepper">
        {[...steps, "Confirmar"].map((label, index) => (
          <span key={label} className={`step-pill${index === step ? " active" : ""}`}>
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <form className="stack-md" onSubmit={(event) => event.preventDefault()}>
        {step === 0 ? (
          <>
            <Select
              label="Tipo de cuenta"
              options={[
                { value: "patient", label: "Paciente" },
                { value: "professional", label: "Profesional" },
              ]}
              error={errors.role?.message}
              {...register("role")}
            />
            <Input
              label="Nombre completo"
              placeholder="Nombre y apellido"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            <Input
              label="Email"
              placeholder="nombre@correo.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Input
              label="Telefono"
              placeholder="+54 11 ..."
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="Documento"
              placeholder="DNI / documento"
              error={errors.document?.message}
              {...register("document")}
            />
            {role === "professional" ? (
              <>
                <Input
                  label="Especialidad"
                  placeholder="Clinica medica"
                  error={errors.specialty?.message}
                  {...register("specialty")}
                />
                <Input
                  label="Matricula"
                  placeholder="MP 45122"
                  error={errors.license?.message}
                  {...register("license")}
                />
              </>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Input
              label="Contrasena"
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
            <label className="checkbox-row">
              <input type="checkbox" {...register("acceptedTerms")} />
              <span>Acepto terminos, privacidad y trazabilidad de uso de la plataforma.</span>
            </label>
            {errors.acceptedTerms?.message ? (
              <span className="field-error">{errors.acceptedTerms.message}</span>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <div className="auth-confirmation-minimal">
            <strong className="title-md">Cuenta creada</strong>
            <p className="meta">Tu cuenta ya esta lista para empezar a usar Docly.</p>
            <Button
              type="button"
              fullWidth
              onClick={() =>
                navigate(createdRole === "professional" ? "/professional" : "/patient", {
                  replace: true,
                })
              }
            >
              Ir al inicio
            </Button>
          </div>
        ) : null}

        {serverError ? <span className="field-error">{serverError}</span> : null}

        {step < 3 ? (
          <div className="form-actions auth-form-actions">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}>
                Volver
              </Button>
            ) : null}

            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              {step === steps.length - 1
                ? isSubmitting
                  ? "Creando cuenta..."
                  : "Crear cuenta"
                : "Continuar"}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
