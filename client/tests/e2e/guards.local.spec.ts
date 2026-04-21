import { expect, test } from "@playwright/test";
import { mockLocalApi } from "./support/local-api";

test.describe.serial("local guards smoke", () => {
  test("keeps patient sessions out of professional routes", async ({ page }) => {
    const api = await mockLocalApi(page);
    api.setRole("patient");

    await page.goto("/professional/schedule");

    await expect(page).toHaveURL(/\/patient(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  });

  test("keeps professional sessions out of patient routes", async ({ page }) => {
    const api = await mockLocalApi(page);
    api.setRole("professional");

    await page.goto("/patient/appointments");

    await expect(page).toHaveURL(/\/professional(?:\/)?$/);
    await expect(page.getByRole("heading", { name: "Agenda del dia" })).toBeVisible();
  });
});
