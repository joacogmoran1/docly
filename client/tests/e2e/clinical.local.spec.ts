import { expect, test, type Page } from "@playwright/test";
import { mockLocalApi } from "./support/local-api";

interface LocalRouteCheck {
  path: string;
  heading: RegExp;
  bodyText: RegExp;
}

const patientRoutes: LocalRouteCheck[] = [
  {
    path: "/patient/appointments",
    heading: /Turnos/,
    bodyText: /Control clinico|Turnos/,
  },
  {
    path: "/patient/studies",
    heading: /Estudios/,
    bodyText: /Laboratorio general|Estudios/,
  },
  {
    path: "/patient/prescriptions",
    heading: /Recetas/,
    bodyText: /Levotiroxina 75 mcg|Recetas/,
  },
];

const professionalRoutes: LocalRouteCheck[] = [
  {
    path: "/professional/schedule",
    heading: /Turnos del dia/,
    bodyText: /Seguimiento|Turnos del dia/,
  },
  {
    path: "/professional/offices",
    heading: /Consultorios/,
    bodyText: /Recoleta|Consultorios/,
  },
];

async function loginAs(page: Page, email: string) {
  await page.goto("/auth/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("demo-password");
  await page.getByTestId("login-submit").click();
}

async function expectLocalRoute(page: Page, route: LocalRouteCheck) {
  await page.goto(route.path);
  await expect(page).toHaveURL(new RegExp(`${route.path}(?:/)?$`));
  await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  await expect(page.locator("body")).toContainText(route.bodyText);
}

test.describe.serial("local clinical smoke", () => {
  test("patient clinical routes render with the mocked API", async ({ page }) => {
    await mockLocalApi(page);
    await loginAs(page, "sofia@docly.app");

    for (const route of patientRoutes) {
      await expectLocalRoute(page, route);
    }
  });

  test("professional clinical routes render with the mocked API", async ({ page }) => {
    await mockLocalApi(page);
    await loginAs(page, "doctor@docly.app");

    for (const route of professionalRoutes) {
      await expectLocalRoute(page, route);
    }
  });
});
