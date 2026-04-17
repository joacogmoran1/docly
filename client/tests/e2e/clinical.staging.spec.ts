import { expect, test, type Page } from "@playwright/test";
import { login, logout } from "./support/auth";
import { getAppUrl, hasBaseUrl } from "./support/env";

interface RouteCheck {
	path: string;
	successText: RegExp;
	errorText: string;
}

const patientRoutes: RouteCheck[] = [
	{ path: "/patient", successText: /Inicio/, errorText: "No pudimos cargar el inicio." },
	{ path: "/patient/appointments", successText: /Turnos/, errorText: "No pudimos cargar los turnos." },
	{
		path: "/patient/records",
		successText: /Registros medicos|Resultados/,
		errorText: "No pudimos cargar tus registros.",
	},
	{ path: "/patient/studies", successText: /Estudios/, errorText: "No pudimos cargar los estudios." },
	{ path: "/patient/prescriptions", successText: /Recetas/, errorText: "No pudimos cargar las recetas." },
	{ path: "/patient/professionals", successText: /Profesionales/, errorText: "No pudimos cargar profesionales." },
	{ path: "/patient/health", successText: /Salud/, errorText: "No pudimos cargar tus datos." },
];

const professionalRoutes: RouteCheck[] = [
	{ path: "/professional", successText: /Agenda del dia/, errorText: "No pudimos cargar el inicio." },
	{
		path: "/professional/schedule",
		successText: /Turnos del dia/,
		errorText: "No pudimos cargar la agenda.",
	},
	{ path: "/professional/patients", successText: /Pacientes/, errorText: "No pudimos cargar pacientes." },
	{
		path: "/professional/records",
		successText: /Registros medicos|Resultados/,
		errorText: "No pudimos cargar los registros del profesional.",
	},
	{ path: "/professional/studies", successText: /Estudios/, errorText: "No pudimos cargar los estudios." },
	{
		path: "/professional/prescriptions",
		successText: /Recetas del profesional|Recetas emitidas/,
		errorText: "No pudimos cargar recetas.",
	},
	{ path: "/professional/offices", successText: /Consultorios/, errorText: "No pudimos cargar consultorios." },
];

async function expectRouteHealthy(page: Page, route: RouteCheck) {
	await page.goto(getAppUrl(route.path));
	await expect(
		page,
	).toHaveURL(new RegExp(`${route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/)?$`));
	await expect(page.locator("body")).toContainText(route.successText);
	await expect(page.getByText(route.errorText)).toHaveCount(0);
}

test.describe.serial("staging clinical smoke", () => {
	test("patient routes load through the final proxy", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await login(page, "patient");

		for (const route of patientRoutes) {
			await expectRouteHealthy(page, route);
		}

		await logout(page);
	});

	test("professional routes load through the final proxy", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await login(page, "professional");

		for (const route of professionalRoutes) {
			await expectRouteHealthy(page, route);
		}

		await logout(page);
	});
});
