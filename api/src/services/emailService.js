import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import env from '../config/env.js';

let transporterPromise = null;

async function getTransporter() {
	if (transporterPromise) return transporterPromise;

	transporterPromise = (async () => {
		if (!env.email.host) {
			if (env.nodeEnv === 'production') {
				throw new Error('SMTP_HOST es obligatorio en producción.');
			}

			const testAccount = await nodemailer.createTestAccount();
			logger.info({
				message: 'Usando cuenta Ethereal para emails de desarrollo.',
				user: testAccount.user,
			});

			return nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass,
				},
			});
		}

		return nodemailer.createTransport({
			host: env.email.host,
			port: env.email.port,
			secure: env.email.secure,
			auth: {
				user: env.email.user,
				pass: env.email.pass,
			},
		});
	})();

	return transporterPromise;
}

async function sendMail({ to, subject, text, html }) {
	const transporter = await getTransporter();

	const info = await transporter.sendMail({
		from: env.email.from,
		to,
		subject,
		text,
		html,
	});

	const previewUrl = nodemailer.getTestMessageUrl(info);
	if (previewUrl) {
		logger.info({ message: 'Preview del email disponible.', previewUrl });
	}

	logger.info({ message: 'Email enviado.', to, messageId: info.messageId });

	return { messageId: info.messageId, previewUrl: previewUrl || null };
}

class EmailService {
	async assertProductionReadiness() {
		if (env.nodeEnv !== 'production') {
			return;
		}

		await getTransporter();
	}

	async sendPasswordResetEmail(email, token) {
		const frontendBaseUrl = env.cors.allowedOrigins[0] || 'http://localhost:3000';
		const resetLink = `${frontendBaseUrl}/auth/reset-password?token=${token}`;
		const subject = 'Docly - Restablecer contraseña';
		const text = [
			'Recibimos una solicitud para restablecer tu contraseña en Docly.',
			'',
			'Hacé clic en el siguiente enlace para crear una nueva contraseña:',
			resetLink,
			'',
			'Este enlace expira en 1 hora.',
			'Si no solicitaste este cambio, podés ignorar este email.',
			'',
			'- Equipo Docly',
		].join('\n');

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
				<h2 style="color: #111; margin-bottom: 8px;">Restablecer contraseña</h2>
				<p style="color: #555; line-height: 1.6;">
					Recibimos una solicitud para restablecer tu contraseña en Docly.
				</p>
				<p style="margin: 24px 0;">
					<a href="${resetLink}"
					   style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500;">
						Crear nueva contraseña
					</a>
				</p>
				<p style="color: #888; font-size: 0.9rem; line-height: 1.5;">
					Este enlace expira en 1 hora.<br/>
					Si no solicitaste este cambio, podés ignorar este email.
				</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="color: #aaa; font-size: 0.8rem;">Docly - Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: email, subject, text, html });
	}

	async sendEmailChangeNotification(oldEmail, newEmail) {
		const subject = 'Docly - Tu email fue actualizado';
		const text = [
			'Te informamos que el email de tu cuenta en Docly fue actualizado.',
			`Nuevo email: ${newEmail}`,
			'',
			'Si no realizaste este cambio, contactá a soporte inmediatamente.',
			'',
			'- Equipo Docly',
		].join('\n');

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
				<h2 style="color: #111; margin-bottom: 8px;">Email actualizado</h2>
				<p style="color: #555; line-height: 1.6;">
					El email de tu cuenta en Docly fue actualizado a <strong>${newEmail}</strong>.
				</p>
				<p style="color: #888; font-size: 0.9rem;">
					Si no realizaste este cambio, contactá a soporte inmediatamente.
				</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="color: #aaa; font-size: 0.8rem;">Docly - Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: oldEmail, subject, text, html });
	}

	async sendAccountDeletedNotification(email) {
		const subject = 'Docly - Cuenta eliminada';
		const text = [
			'Tu cuenta en Docly fue desactivada exitosamente.',
			'',
			'Si querés reactivarla en el futuro, contactá a soporte.',
			'',
			'- Equipo Docly',
		].join('\n');

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
				<h2 style="color: #111; margin-bottom: 8px;">Cuenta eliminada</h2>
				<p style="color: #555; line-height: 1.6;">
					Tu cuenta en Docly fue desactivada exitosamente.
				</p>
				<p style="color: #888; font-size: 0.9rem;">
					Si querés reactivarla en el futuro, contactá a soporte.
				</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
				<p style="color: #aaa; font-size: 0.8rem;">Docly - Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: email, subject, text, html });
	}
}

export default new EmailService();
