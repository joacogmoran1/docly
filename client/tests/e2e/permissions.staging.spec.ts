import { expect, test } from "@playwright/test";
import { login, logout } from "./support/auth";
import { getAppUrl, hasBaseUrl } from "./support/env";

test.describe.serial("staging permissions smoke", () => {
	test("redirects unauthenticated users to login", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await page.goto(getAppUrl("/patient/appointments"));
		await expect(page).toHaveURL(/\/auth\/login(?:\/)?$/);
		await expect(page.getByTestId("login-submit")).toBeVisible();
	});

	test("keeps patient sessions out of professional routes", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await login(page, "patient");
		await page.goto(getAppUrl("/professional/schedule"));

		await expect(page).toHaveURL(/\/patient(?:\/)?$/);
		await expect(page.locator("body")).toContainText(/Inicio|Turnos|Profesionales/);

		await logout(page);
	});

	test("keeps professional sessions out of patient routes", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await login(page, "professional");
		await page.goto(getAppUrl("/patient/appointments"));

		await expect(page).toHaveURL(/\/professional(?:\/)?$/);
		await expect(page.locator("body")).toContainText(/Agenda del dia|Turnos del dia|Pacientes/);

		await logout(page);
	});
});
