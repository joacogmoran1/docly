import { expect, test } from "@playwright/test";
import {
	collectSetCookieHeaders,
	getCookie,
	login,
	logout,
	readAppCookies,
} from "./support/auth";
import {
	getAppOrigin,
	getAppUrl,
	getExpectedSameSite,
	getResetPasswordConfig,
	hasBaseUrl,
	shouldExpectSecureCookies,
} from "./support/env";

test.describe.serial("staging auth smoke", () => {
	test("login emits cookies, stays same-origin and enforces csrf", async ({ page, context }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		const apiOrigins = new Set<string>();
		page.on("request", (request) => {
			if (request.url().includes("/api/")) {
				apiOrigins.add(new URL(request.url()).origin);
			}
		});

		const loginResponse = await login(page, "patient");
		expect(loginResponse.status()).toBe(200);

		const setCookieHeaders = collectSetCookieHeaders(loginResponse);
		expect(setCookieHeaders.some((header) => header.startsWith("token="))).toBeTruthy();
		expect(
			setCookieHeaders.some(
				(header) => header.startsWith("refresh_token=") && header.includes("Path=/api/auth"),
			),
		).toBeTruthy();
		expect(setCookieHeaders.some((header) => header.startsWith("csrf_token="))).toBeTruthy();

		const cookies = await readAppCookies(context);
		const tokenCookie = getCookie(cookies, "token");
		const refreshCookie = getCookie(cookies, "refresh_token");
		const csrfCookie = getCookie(cookies, "csrf_token");

		expect(tokenCookie).toBeTruthy();
		expect(refreshCookie).toBeTruthy();
		expect(csrfCookie).toBeTruthy();
		expect(tokenCookie?.httpOnly).toBeTruthy();
		expect(refreshCookie?.httpOnly).toBeTruthy();
		expect(csrfCookie?.httpOnly).toBeFalsy();
		expect(refreshCookie?.path).toBe("/api/auth");
		expect(tokenCookie?.sameSite).toBe(getExpectedSameSite());
		expect(refreshCookie?.sameSite).toBe(getExpectedSameSite());

		if (shouldExpectSecureCookies()) {
			expect(tokenCookie?.secure).toBeTruthy();
			expect(refreshCookie?.secure).toBeTruthy();
			expect(csrfCookie?.secure).toBeTruthy();
		}

		const visibleCookies = await page.evaluate(() => document.cookie);
		expect(visibleCookies).toContain("csrf_token=");
		expect(visibleCookies).not.toContain("token=");
		expect(visibleCookies).not.toContain("refresh_token=");

		const csrfFailure = await page.evaluate(async () => {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "include",
				headers: {
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
				},
			});

			return {
				status: response.status,
				body: await response.text(),
			};
		});

		expect(csrfFailure.status).toBe(403);
		expect(csrfFailure.body).toContain("CSRF");

		for (const origin of apiOrigins) {
			expect(origin).toBe(getAppOrigin());
		}

		await logout(page);
	});

	test("refreshes the session with the refresh cookie behind the final proxy", async ({
		page,
		context,
	}) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await login(page, "patient");

		const originalCookies = await readAppCookies(context);
		const refreshCookie = getCookie(originalCookies, "refresh_token");
		const csrfCookie = getCookie(originalCookies, "csrf_token");
		expect(refreshCookie).toBeTruthy();
		expect(csrfCookie).toBeTruthy();

		await context.clearCookies();
		await context.addCookies([refreshCookie!, csrfCookie!]);

		const refreshResponsePromise = page.waitForResponse(
			(response) =>
				response.url().includes("/api/auth/refresh") &&
				response.request().method() === "POST",
		);

		await page.locator('a[href="/patient/appointments"]').click();
		const refreshResponse = await refreshResponsePromise;

		expect(refreshResponse.status()).toBe(200);
		await expect(page).toHaveURL(/\/patient\/appointments(?:\/)?$/);
		await expect(page.getByRole("heading", { name: "Turnos" })).toBeVisible();

		const rotatedCookies = await readAppCookies(context);
		const rotatedToken = getCookie(rotatedCookies, "token");
		const rotatedRefresh = getCookie(rotatedCookies, "refresh_token");

		expect(rotatedToken).toBeTruthy();
		expect(rotatedRefresh).toBeTruthy();
		expect(rotatedRefresh?.value).not.toBe(refreshCookie?.value);

		await logout(page);
	});

	test("logout clears auth cookies", async ({ page, context }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		const loginResponse = await login(page, "patient");
		expect(loginResponse.status()).toBe(200);

		const logoutResponse = await logout(page);
		expect(logoutResponse.status()).toBe(200);

		const setCookieHeaders = collectSetCookieHeaders(logoutResponse);
		expect(setCookieHeaders.some((header) => header.startsWith("token="))).toBeTruthy();
		expect(setCookieHeaders.some((header) => header.startsWith("refresh_token="))).toBeTruthy();

		const cookies = await readAppCookies(context);
		expect(getCookie(cookies, "token")).toBeFalsy();
		expect(getCookie(cookies, "refresh_token")).toBeFalsy();
		expect(getCookie(cookies, "csrf_token")).toBeFalsy();
	});

	test("submits forgot-password against staging", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		await page.goto(getAppUrl("/auth/forgot-password"));
		await page.getByTestId("forgot-password-email").fill("docly-smoke@example.com");

		const responsePromise = page.waitForResponse(
			(response) =>
				response.url().includes("/api/auth/forgot-password") &&
				response.request().method() === "POST",
		);

		await page.getByTestId("forgot-password-submit").click();

		const response = await responsePromise;
		expect(response.status()).toBe(200);
		await expect(page.getByTestId("forgot-password-success")).toContainText("Revisa tu correo");
	});

	test("resets the password when a staging reset URL is provided", async ({ page }) => {
		test.skip(!hasBaseUrl(), "Set DOCLY_E2E_BASE_URL to run staging smoke tests.");

		const resetConfig = getResetPasswordConfig();
		test.skip(
			!resetConfig.ready,
			"Set DOCLY_E2E_RESET_PASSWORD_URL and DOCLY_E2E_RESET_PASSWORD_NEW_PASSWORD to exercise the reset flow.",
		);

		await page.goto(resetConfig.url!);
		await page.getByTestId("reset-password-new").fill(resetConfig.newPassword!);
		await page.getByTestId("reset-password-confirm").fill(resetConfig.newPassword!);

		const responsePromise = page.waitForResponse(
			(response) =>
				response.url().includes("/api/auth/reset-password") &&
				response.request().method() === "POST",
		);

		await page.getByTestId("reset-password-submit").click();
		const response = await responsePromise;

		expect(response.status()).toBe(200);
		await expect(page.getByTestId("reset-password-success")).toContainText(
			"Contrasena actualizada",
		);
	});
});
