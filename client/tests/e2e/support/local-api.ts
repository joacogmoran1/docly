import type { Page, Route } from "@playwright/test";

type DoclyRole = "patient" | "professional";

function json(route: Route, status: number, body: unknown, headers?: Record<string, string>) {
  return route.fulfill({
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function getApiUser(role: DoclyRole) {
  if (role === "patient") {
    return {
      id: "patient-user-1",
      email: "sofia@docly.app",
      name: "Sofia",
      lastName: "Martinez",
      phone: "+54 11 5555 0001",
      role: "patient",
      isActive: true,
      patient: {
        id: "patient-1",
        userId: "patient-user-1",
        birthDate: "1992-09-12",
        gender: "female",
        bloodType: "A+",
        medicalCoverage: "Cobertura demo",
        coverageNumber: "12345",
      },
      professional: null,
    };
  }

  return {
    id: "professional-user-1",
    email: "lucas@docly.app",
    name: "Lucas",
    lastName: "Herrera",
    phone: "+54 11 5555 0002",
    role: "professional",
    isActive: true,
    patient: null,
    professional: {
      id: "professional-1",
      userId: "professional-user-1",
      specialty: "Clinica medica",
      licenseNumber: "MP 45122",
      acceptedCoverages: ["Swiss Medical"],
      fees: null,
    },
  };
}

const patientAppointmentsResponse = {
  success: true,
  results: 1,
  data: [
    {
      id: "appointment-1",
      patientId: "patient-1",
      professionalId: "professional-1",
      officeId: "office-1",
      date: "2099-04-18",
      time: "09:30",
      duration: 30,
      status: "confirmed",
      reason: "Control clinico",
      notes: null,
      cancellationReason: null,
      createdAt: "2099-04-01T09:00:00.000Z",
      updatedAt: "2099-04-01T09:00:00.000Z",
      professional: {
        id: "professional-1",
        user: {
          id: "professional-user-1",
          email: "lucas@docly.app",
          name: "Lucas",
          lastName: "Herrera",
          phone: "+54 11 5555 0002",
        },
      },
      office: {
        id: "office-1",
        name: "Recoleta",
      },
    },
  ],
};

const patientPrescriptionsResponse = {
  success: true,
  results: 1,
  data: [
    {
      id: "prescription-1",
      patientId: "patient-1",
      professionalId: "professional-1",
      medications: [
        {
          name: "Levotiroxina 75 mcg",
          dose: "1 comprimido",
          frequency: "Cada manana",
          duration: "30 dias",
        },
      ],
      diagnosis: "Hipotiroidismo",
      instructions: "Tomar en ayunas",
      validUntil: "2099-05-01",
      createdAt: "2099-04-01T09:00:00.000Z",
      updatedAt: "2099-04-01T09:00:00.000Z",
      professional: {
        id: "professional-1",
        user: {
          id: "professional-user-1",
          email: "lucas@docly.app",
          name: "Lucas",
          lastName: "Herrera",
          phone: "+54 11 5555 0002",
        },
      },
    },
  ],
};

const patientStudiesResponse = {
  success: true,
  results: 1,
  data: [
    {
      id: "study-1",
      patientId: "patient-1",
      professionalId: "professional-1",
      type: "Laboratorio general",
      date: "2099-04-01",
      results: "data:application/pdf;base64,ZmFrZQ==",
      fileUrl: null,
      notes: null,
      createdAt: "2099-04-01T09:00:00.000Z",
      updatedAt: "2099-04-01T09:00:00.000Z",
      professional: {
        id: "professional-1",
        user: {
          id: "professional-user-1",
          email: "lucas@docly.app",
          name: "Lucas",
          lastName: "Herrera",
          phone: "+54 11 5555 0002",
        },
      },
    },
  ],
};

const professionalAppointmentsResponse = {
  success: true,
  results: 1,
  data: [
    {
      id: "appointment-2",
      patientId: "patient-1",
      professionalId: "professional-1",
      officeId: "office-1",
      date: "2099-04-18",
      time: "10:00",
      duration: 30,
      status: "confirmed",
      reason: "Seguimiento",
      notes: null,
      cancellationReason: null,
      createdAt: "2099-04-01T09:00:00.000Z",
      updatedAt: "2099-04-01T09:00:00.000Z",
      patient: {
        id: "patient-1",
        user: {
          id: "patient-user-1",
          email: "sofia@docly.app",
          name: "Sofia",
          lastName: "Martinez",
          phone: "+54 11 5555 0001",
        },
      },
      office: {
        id: "office-1",
        name: "Recoleta",
      },
    },
  ],
};

const professionalOfficesResponse = {
  success: true,
  results: 1,
  data: [
    {
      id: "office-1",
      professionalId: "professional-1",
      name: "Recoleta",
      address: "Paraguay 1842",
      phone: "+54 11 4444 0000",
      appointmentDuration: 30,
      schedules: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        },
      ],
    },
  ],
};

export async function mockLocalApi(page: Page) {
  let currentRole: DoclyRole | null = null;
  let csrfToken = "csrf-local-token";

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/auth/csrf-token" && method === "GET") {
      return json(
        route,
        200,
        {
          success: true,
          message: "csrf-ready",
        },
        {
          "set-cookie": `csrf_token=${csrfToken}; Path=/; SameSite=Lax`,
        },
      );
    }

    if (path === "/api/auth/profile" && method === "GET") {
      if (!currentRole) {
        return json(route, 401, {
          success: false,
          message: "No autenticado",
        });
      }

      return json(route, 200, {
        success: true,
        user: getApiUser(currentRole),
      });
    }

    if (path === "/api/auth/login" && method === "POST") {
      const payload = request.postDataJSON() as { email?: string } | null;
      const email = payload?.email ?? "";
      currentRole = email.includes("doctor") || email.includes("lucas")
        ? "professional"
        : "patient";

      return json(route, 200, {
        success: true,
        user: getApiUser(currentRole),
      });
    }

    if (path === "/api/auth/logout" && method === "POST") {
      currentRole = null;
      csrfToken = "csrf-local-token";

      return json(route, 200, {
        success: true,
        message: "Sesion cerrada",
      });
    }

    if (path === "/api/auth/refresh" && method === "POST") {
      if (!currentRole) {
        return json(route, 401, {
          success: false,
          message: "Refresh no disponible",
        });
      }

      return json(route, 200, {
        success: true,
        message: "Sesion renovada",
      });
    }

    if (path === "/api/appointments/patient/patient-1" && method === "GET") {
      return json(route, 200, patientAppointmentsResponse);
    }

    if (path === "/api/prescriptions/patient/patient-1" && method === "GET") {
      return json(route, 200, patientPrescriptionsResponse);
    }

    if (path === "/api/studies/patient/patient-1" && method === "GET") {
      return json(route, 200, patientStudiesResponse);
    }

    if (path === "/api/appointments/professional/professional-1" && method === "GET") {
      return json(route, 200, professionalAppointmentsResponse);
    }

    if (path === "/api/offices/professional/professional-1" && method === "GET") {
      return json(route, 200, professionalOfficesResponse);
    }

    if (path === "/api/offices/office-1/blocks" && method === "GET") {
      return json(route, 200, {
        success: true,
        results: 0,
        data: [],
      });
    }

    return json(route, 404, {
      success: false,
      message: `Unhandled mocked route: ${method} ${path}`,
    });
  });

  return {
    setRole(nextRole: DoclyRole | null) {
      currentRole = nextRole;
    },
  };
}
