import { render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryRouter,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/router/auth.routes", () => ({
  authRoutes: {
    path: "auth",
    element: <Outlet />,
    children: [
      { path: "login", element: <div>Ruta login</div> },
      { path: "reset-password", element: <div>Ruta reset password</div> },
    ],
  },
}));

vi.mock("@/app/router/patient.routes", () => ({
  patientRoutes: {
    path: "patient",
    element: <div>Area paciente</div>,
  },
}));

vi.mock("@/app/router/professional.routes", () => ({
  professionalRoutes: {
    path: "professional",
    element: <div>Area profesional</div>,
  },
}));

vi.mock("@/app/guards/AuthGuard", () => ({
  AuthGuard: () => <Outlet />,
}));

import { appRoutes } from "@/app/router";

function renderAt(path: string) {
  const router = createMemoryRouter([...appRoutes], {
    initialEntries: [path],
  });

  return render(<RouterProvider router={router} />);
}

describe("app router", () => {
  it("redirects the root path to login", async () => {
    renderAt("/");

    await waitFor(() => {
      expect(screen.getByText("Ruta login")).toBeInTheDocument();
    });
  });

  it("keeps the reset password legacy route redirect", async () => {
    renderAt("/reset-password");

    await waitFor(() => {
      expect(screen.getByText("Ruta reset password")).toBeInTheDocument();
    });
  });

  it("mounts the protected route branch", async () => {
    renderAt("/patient");

    await waitFor(() => {
      expect(screen.getByText("Area paciente")).toBeInTheDocument();
    });
  });

  it("redirects unknown routes to login", async () => {
    renderAt("/ruta-inexistente");

    await waitFor(() => {
      expect(screen.getByText("Ruta login")).toBeInTheDocument();
    });
  });
});
