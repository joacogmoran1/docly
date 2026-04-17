export type DoclyRole = "patient" | "professional";

interface Credentials {
	email: string;
	password: string;
}

function readEnv(name: string) {
	const value = process.env[name]?.trim();
	return value ? value : null;
}

export function hasBaseUrl() {
	return Boolean(readEnv("DOCLY_E2E_BASE_URL"));
}

export function requireEnv(name: string) {
	const value = readEnv(name);
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getAppUrl(path: string) {
	const baseUrl = requireEnv("DOCLY_E2E_BASE_URL");
	return new URL(path, `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`).toString();
}

export function getAppOrigin() {
	return new URL(requireEnv("DOCLY_E2E_BASE_URL")).origin;
}

export function getRoleCredentials(role: DoclyRole): Credentials {
	if (role === "patient") {
		return {
			email: requireEnv("DOCLY_E2E_PATIENT_EMAIL"),
			password: requireEnv("DOCLY_E2E_PATIENT_PASSWORD"),
		};
	}

	return {
		email: requireEnv("DOCLY_E2E_PROFESSIONAL_EMAIL"),
		password: requireEnv("DOCLY_E2E_PROFESSIONAL_PASSWORD"),
	};
}

export function getExpectedSameSite() {
	const sameSite = (readEnv("DOCLY_E2E_EXPECT_SAME_SITE") ?? "lax").toLowerCase();

	switch (sameSite) {
		case "strict":
			return "Strict";
		case "none":
			return "None";
		default:
			return "Lax";
	}
}

export function shouldExpectSecureCookies() {
	const explicit = readEnv("DOCLY_E2E_EXPECT_SECURE_COOKIES");
	if (explicit) {
		return explicit === "true";
	}

	return new URL(requireEnv("DOCLY_E2E_BASE_URL")).protocol === "https:";
}

export function getResetPasswordConfig() {
	const url = readEnv("DOCLY_E2E_RESET_PASSWORD_URL");
	const newPassword = readEnv("DOCLY_E2E_RESET_PASSWORD_NEW_PASSWORD");

	return {
		url,
		newPassword,
		ready: Boolean(url && newPassword),
	};
}
