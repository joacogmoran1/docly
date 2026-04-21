import { render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "@/app/guards/AuthGuard";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { RoleGuard } from "@/app/guards/RoleGuard";
import { createSessionUser } from "@/test/factories/auth";

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/providers/AuthProvider", () => authMocks);

function renderRoute(routes: RouteObject[], initialEntry: string) {
  const router = createMemoryRouter(routes, {
    initialEntries: [initialEntry],
  });

  return render(<RouterProvider router={router} />);
}

describe("route guards", () => {
  beforeEach(() => {
    authMocks.useAuth.mockReset();
  });

  it("shows a bootstrapping fallback while the auth context restores the session", () => {
    authMocks.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isBootstrapping: true,
    });

    renderRoute(
      [
        {
          path: "/private",
          element: <AuthGuard />,
          children: [{ index: true, element: <div>Contenido privado</div> }],
        },
      ],
      "/private",
    );

    expect(screen.getByText(/Cargando sesi/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", async () => {
    authMocks.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isBootstrapping: false,
    });

    renderRoute(
      [
        {
          path: "/private",
          element: <AuthGuard />,
          children: [{ index: true, element: <div>Contenido privado</div> }],
        },
        {
          path: "/auth/login",
          element: <div>Pantalla de login</div>,
        },
      ],
      "/private",
    );

    await waitFor(() => {
      expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    });
  });

  it("renders protected content for authenticated users", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser(),
      isAuthenticated: true,
      isBootstrapping: false,
    });

    renderRoute(
      [
        {
          path: "/private",
          element: <AuthGuard />,
          children: [{ index: true, element: <div>Contenido privado</div> }],
        },
      ],
      "/private",
    );

    await waitFor(() => {
      expect(screen.getByText("Contenido privado")).toBeInTheDocument();
    });
  });

  it("redirects users without the required permission to their home route", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        permissions: ["appointments:read"],
      }),
    });

    renderRoute(
      [
        {
          path: "/restricted",
          element: <PermissionGuard permission="profile:write" />,
          children: [{ index: true, element: <div>Zona restringida</div> }],
        },
        {
          path: "/patient",
          element: <div>Inicio paciente</div>,
        },
      ],
      "/restricted",
    );

    await waitFor(() => {
      expect(screen.getByText("Inicio paciente")).toBeInTheDocument();
    });
  });

  it("redirects professionals without the required permission to their home route", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "professional",
        permissions: ["appointments:read"],
      }),
    });

    renderRoute(
      [
        {
          path: "/restricted",
          element: <PermissionGuard permission="profile:write" />,
          children: [{ index: true, element: <div>Zona restringida</div> }],
        },
        {
          path: "/professional",
          element: <div>Inicio profesional</div>,
        },
      ],
      "/restricted",
    );

    await waitFor(() => {
      expect(screen.getByText("Inicio profesional")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated users away from permission-protected routes", async () => {
    authMocks.useAuth.mockReturnValue({
      user: null,
    });

    renderRoute(
      [
        {
          path: "/restricted",
          element: <PermissionGuard permission="profile:write" />,
          children: [{ index: true, element: <div>Zona restringida</div> }],
        },
        {
          path: "/auth/login",
          element: <div>Pantalla de login</div>,
        },
      ],
      "/restricted",
    );

    await waitFor(() => {
      expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    });
  });

  it("allows access when the current user has the required permission", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        permissions: ["profile:write"],
      }),
    });

    renderRoute(
      [
        {
          path: "/profile",
          element: <PermissionGuard permission="profile:write" />,
          children: [{ index: true, element: <div>Perfil editable</div> }],
        },
      ],
      "/profile",
    );

    await waitFor(() => {
      expect(screen.getByText("Perfil editable")).toBeInTheDocument();
    });
  });

  it("redirects users with the wrong role away from the route", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "professional",
      }),
    });

    renderRoute(
      [
        {
          path: "/patient-only",
          element: <RoleGuard allowedRoles={["patient"]} />,
          children: [{ index: true, element: <div>Area paciente</div> }],
        },
        {
          path: "/professional",
          element: <div>Inicio profesional</div>,
        },
      ],
      "/patient-only",
    );

    await waitFor(() => {
      expect(screen.getByText("Inicio profesional")).toBeInTheDocument();
    });
  });

  it("redirects patients away from professional-only routes to their home", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
      }),
    });

    renderRoute(
      [
        {
          path: "/professional-only",
          element: <RoleGuard allowedRoles={["professional"]} />,
          children: [{ index: true, element: <div>Area profesional</div> }],
        },
        {
          path: "/patient",
          element: <div>Inicio paciente</div>,
        },
      ],
      "/professional-only",
    );

    await waitFor(() => {
      expect(screen.getByText("Inicio paciente")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated users away from role-protected routes", async () => {
    authMocks.useAuth.mockReturnValue({
      user: null,
    });

    renderRoute(
      [
        {
          path: "/patient-only",
          element: <RoleGuard allowedRoles={["patient"]} />,
          children: [{ index: true, element: <div>Area paciente</div> }],
        },
        {
          path: "/auth/login",
          element: <div>Pantalla de login</div>,
        },
      ],
      "/patient-only",
    );

    await waitFor(() => {
      expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
    });
  });

  it("allows access when the current role is authorized", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "professional",
      }),
    });

    renderRoute(
      [
        {
          path: "/professional-only",
          element: <RoleGuard allowedRoles={["professional"]} />,
          children: [{ index: true, element: <div>Area profesional</div> }],
        },
      ],
      "/professional-only",
    );

    await waitFor(() => {
      expect(screen.getByText("Area profesional")).toBeInTheDocument();
    });
  });
});
