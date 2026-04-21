import { expect, test } from "@playwright/test";
import { mockLocalApi } from "./support/local-api";

test.describe.serial("local auth smoke", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await mockLocalApi(page);

    await page.goto("/patient/appointments");

    await expect(page).toHaveURL(/\/auth\/login(?:\/)?$/);
    await expect(page.getByTestId("login-submit")).toBeVisible();
  });

  test("logs in as patient and restores the protected route after reload", async ({
    page,
  }) => {
    await mockLocalApi(page);

    await page.goto("/auth/login");
    await page.getByTestId("login-email").fill("sofia@docly.app");
    await page.getByTestId("login-password").fill("demo-password");
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/patient(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/patient(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  });

  test("logs in as professional and can navigate through protected routes", async ({
    page,
  }) => {
    await mockLocalApi(page);

    await page.goto("/auth/login");
    await page.getByTestId("login-email").fill("doctor@docly.app");
    await page.getByTestId("login-password").fill("demo-password");
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/professional(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Agenda del dia" })).toBeVisible();
    await page.getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/professional\/schedule(?:\/)?$/);
    await expect(page.getByText("Turnos del dia")).toBeVisible();
  });
});
