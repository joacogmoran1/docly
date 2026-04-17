import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useState } from "react";
import { forgotPasswordSchema } from "@/modules/auth/schemas/login.schema";
import type { ForgotPasswordFormValues } from "@/modules/auth/types/auth-forms";
import { requestPasswordReset } from "@/modules/auth/api/auth.api";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

const isDev = import.meta.env.DEV;

export function ForgotPasswordPage() {
	const [submitted, setSubmitted] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [resetLink, setResetLink] = useState<string | null>(null);
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
			// Solo mostrar link de desarrollo si el backend lo devuelve (dev only)
			setResetLink(isDev ? (response.resetLink ?? null) : null);
			setSubmitted(true);
		} catch (error) {
			setSubmitted(false);
			setMessage(null);
			setResetLink(null);
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
					Ingresa tu email y recibiras un enlace para crear una nueva contrasena.
				</p>
			</div>

			<form className="stack-md" onSubmit={onSubmit} data-testid="forgot-password-form">
				<Input
					label="Email"
					placeholder="nombre@correo.com"
					type="email"
					error={errors.email?.message}
					data-testid="forgot-password-email"
					{...register("email")}
				/>
				{submitted ? (
					<div className="panel" data-testid="forgot-password-success">
						<strong>Revisa tu correo</strong>
						<p className="meta">{message}</p>
						<p className="meta">
							Si no lo encontras, revisa la carpeta de spam.
						</p>
						{isDev && resetLink ? (
							<a href={resetLink} className="helper-text">
								(Dev) Abrir enlace de reseteo
							</a>
						) : null}
					</div>
				) : null}
				{serverError ? <span className="field-error">{serverError}</span> : null}
				<Button
					type="submit"
					fullWidth
					disabled={isSubmitting || submitted}
					data-testid="forgot-password-submit"
				>
					{isSubmitting ? "Enviando..." : submitted ? "Enlace enviado" : "Enviar enlace"}
				</Button>
			</form>

			<Link to="/auth/login" className="helper-text">
				Volver al login
			</Link>
		</div>
	);
}
