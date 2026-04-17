import { expect, type BrowserContext, type Page, type Response } from "@playwright/test";
import { getAppOrigin, getAppUrl, getRoleCredentials, type DoclyRole } from "./env";

export interface TrackedCookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	httpOnly: boolean;
	secure: boolean;
	sameSite: "Strict" | "Lax" | "None";
}

export function getCookie(
	cookies: Awaited<ReturnType<BrowserContext["cookies"]>>,
	name: string,
) {
	return cookies.find((cookie) => cookie.name === name);
}

export async function gotoLogin(page: Page) {
	await page.goto(getAppUrl("/auth/login"));
	await expect(page).toHaveURL(/\/auth\/login$/);
}

export async function login(page: Page, role: DoclyRole) {
	const credentials = getRoleCredentials(role);
	const targetPath = role === "patient" ? "/patient" : "/professional";
	const loginResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes("/api/auth/login") &&
			response.request().method() === "POST",
	);

	await gotoLogin(page);
	await page.getByTestId("login-email").fill(credentials.email);
	await page.getByTestId("login-password").fill(credentials.password);
	await page.getByTestId("login-submit").click();

	const response = await loginResponsePromise;
	await expect(page).toHaveURL(new RegExp(`${targetPath}(?:/)?$`));

	return response;
}

export async function logout(page: Page) {
	const logoutResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes("/api/auth/logout") &&
			response.request().method() === "POST",
	);

	await page.getByTestId("topbar-logout").click();
	const response = await logoutResponsePromise;
	await expect(page).toHaveURL(/\/auth\/login(?:\/)?$/);

	return response;
}

export async function readAppCookies(context: BrowserContext) {
	return context.cookies([getAppOrigin(), getAppUrl("/api/auth/refresh")]);
}

export function collectSetCookieHeaders(response: Response) {
	return response
		.headersArray()
		.filter((header) => header.name.toLowerCase() === "set-cookie")
		.map((header) => header.value);
}
