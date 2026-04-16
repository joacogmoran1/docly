import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Transporte
// ─────────────────────────────────────────────────────────────────────────────
// En producción se espera SMTP real (SendGrid, SES, Mailgun, etc.).
// En desarrollo se usa Ethereal si no hay credenciales configuradas.
// ─────────────────────────────────────────────────────────────────────────────

let transporterPromise = null;

async function getTransporter() {
	if (transporterPromise) return transporterPromise;

	transporterPromise = (async () => {
		if (process.env.SMTP_HOST) {
			return nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: parseInt(process.env.SMTP_PORT || '587', 10),
				secure: process.env.SMTP_SECURE === 'true',
				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS,
				},
			});
		}

		// Fallback a Ethereal para desarrollo
		const testAccount = await nodemailer.createTestAccount();
		logger.info('📧 Usando cuenta Ethereal para emails de desarrollo', {
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
	})();

	return transporterPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FROM_ADDRESS = process.env.EMAIL_FROM || '"Docly" <no-reply@docly.app>';

async function sendMail({ to, subject, text, html }) {
	const transporter = await getTransporter();

	const info = await transporter.sendMail({
		from: FROM_ADDRESS,
		to,
		subject,
		text,
		html,
	});

	// En desarrollo con Ethereal, loguear la URL de preview
	const previewUrl = nodemailer.getTestMessageUrl(info);
	if (previewUrl) {
		logger.info(`📧 Preview del email: ${previewUrl}`);
	}

	logger.info(`📧 Email enviado a ${to} — messageId: ${info.messageId}`);

	return { messageId: info.messageId, previewUrl: previewUrl || null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Emails específicos
// ─────────────────────────────────────────────────────────────────────────────

class EmailService {
	async sendPasswordResetEmail(email, token) {
		const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
		const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

		const subject = 'Docly — Restablecer contraseña';

		const text = [
			'Recibimos una solicitud para restablecer tu contraseña en Docly.',
			'',
			`Hacé clic en el siguiente enlace para crear una nueva contraseña:`,
			resetLink,
			'',
			'Este enlace expira en 1 hora.',
			'Si no solicitaste este cambio, podés ignorar este email.',
			'',
			'— Equipo Docly',
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
				<p style="color: #aaa; font-size: 0.8rem;">Docly — Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: email, subject, text, html });
	}

	async sendEmailChangeNotification(oldEmail, newEmail) {
		const subject = 'Docly — Tu email fue actualizado';

		const text = [
			'Te informamos que el email de tu cuenta en Docly fue actualizado.',
			`Nuevo email: ${newEmail}`,
			'',
			'Si no realizaste este cambio, contactá a soporte inmediatamente.',
			'',
			'— Equipo Docly',
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
				<p style="color: #aaa; font-size: 0.8rem;">Docly — Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: oldEmail, subject, text, html });
	}

	async sendAccountDeletedNotification(email) {
		const subject = 'Docly — Cuenta eliminada';

		const text = [
			'Tu cuenta en Docly fue desactivada exitosamente.',
			'',
			'Si querés reactivarla en el futuro, contactá a soporte.',
			'',
			'— Equipo Docly',
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
				<p style="color: #aaa; font-size: 0.8rem;">Docly — Salud digital simple</p>
			</div>
		`;

		return await sendMail({ to: email, subject, text, html });
	}
}

export default new EmailService();
