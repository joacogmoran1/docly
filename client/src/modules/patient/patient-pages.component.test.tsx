import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionUser } from "@/test/factories/auth";

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const prescriptionApiMocks = vi.hoisted(() => ({
  getPatientPrescriptions: vi.fn(),
}));

const recordApiMocks = vi.hoisted(() => ({
  getPatientMedicalRecords: vi.fn(),
}));

const studiesApiMocks = vi.hoisted(() => ({
  getPatientStudies: vi.fn(),
  createStudy: vi.fn(),
  updateStudy: vi.fn(),
  deleteStudy: vi.fn(),
}));

type StudyModalHarnessProps = {
  isOpen: boolean;
  study?: { id: string; type: string } | null;
  onSubmit: (values: {
    type: string;
    date: string;
    reportContent: string;
    attachmentContent: string;
  }) => Promise<void> | void;
  onClose: () => void;
};

type ConfirmDialogHarnessProps = {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
};

const modalHarness = vi.hoisted(() => ({
  studyEditorModalProps: [] as StudyModalHarnessProps[],
  confirmDialogProps: [] as ConfirmDialogHarnessProps[],
}));

vi.mock("@/app/providers/AuthProvider", () => authMocks);
vi.mock("@/modules/prescriptions/api/prescriptions.api", () => prescriptionApiMocks);
vi.mock("@/modules/medical-records/api/medical-records.api", () => recordApiMocks);
vi.mock("@/modules/studies/api/studies.api", () => studiesApiMocks);
vi.mock("@/modules/patient/dashboard/StudyEditorModal", () => ({
  StudyEditorModal: (props: StudyModalHarnessProps) => {
    modalHarness.studyEditorModalProps.push(props);

    const { isOpen, study, onSubmit, onClose } = props;

    return isOpen ? (
      <>
        <button
          type="button"
          onClick={() => {
            const result = onSubmit({
              type: study?.type ?? "Laboratorio",
              date: "2099-03-01",
              reportContent: "https://example.com/report.pdf",
              attachmentContent: "https://example.com/result-1.jpg",
            });
            if (result && typeof result.then === "function") {
              void result.catch(() => undefined);
            }
          }}
        >
          {study ? "Guardar estudio editado" : "Crear estudio mock"}
        </button>
        <button
          type="button"
          onClick={() => {
            const result = onSubmit({
              type: study?.type ?? "Laboratorio",
              date: "2099-03-01",
              reportContent: "",
              attachmentContent: "",
            });
            if (result && typeof result.then === "function") {
              void result.catch(() => undefined);
            }
          }}
        >
          {study ? "Guardar estudio sin adjuntos" : "Crear estudio sin adjuntos"}
        </button>
        <button type="button" onClick={onClose}>
          {study ? "Cerrar edicion estudio" : "Cerrar creacion estudio"}
        </button>
      </>
    ) : null;
  },
}));
vi.mock("@/shared/components/ConfirmDialog", () => ({
  ConfirmDialog: (props: ConfirmDialogHarnessProps) => {
    modalHarness.confirmDialogProps.push(props);

    const { isOpen, title, onConfirm, onClose } = props;

    return isOpen ? (
      <>
        <button type="button" onClick={onConfirm}>
          Confirmar {title}
        </button>
        <button type="button" onClick={onClose}>
          Cerrar {title}
        </button>
      </>
    ) : null;
  },
}));

import { PatientPrescriptionsPage } from "@/modules/patient/prescriptions/PatientPrescriptionsPage";
import { PatientRecordsPage } from "@/modules/patient/records/PatientRecordsPage";
import { PatientStudiesPage } from "@/modules/patient/studies/PatientStudiesPage";

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function getLastCall<T extends (...args: any[]) => any>(mock: ReturnType<typeof vi.fn<T>>) {
  return mock.mock.calls[mock.mock.calls.length - 1];
}

const allPrescriptions = [
  {
    id: "prescription-1",
    patientId: "patient-42",
    professionalId: "professional-2",
    createdAt: "2099-01-10T10:00:00.000Z",
    updatedAt: "2099-01-10T10:00:00.000Z",
    diagnosis: "Hipotiroidismo",
    instructions: "Tomar en ayunas",
    validUntil: "2099-02-10",
    medications: [
      {
        name: "Levotiroxina",
        dose: "75 mcg",
        frequency: "Diaria",
        duration: "30 dias",
      },
    ],
    professional: {
      id: "professional-2",
      user: {
        id: "user-prof-2",
        name: "Juan",
        lastName: "Perez",
        email: "juan@example.com",
        phone: null,
      },
    },
  },
  {
    id: "prescription-2",
    patientId: "patient-42",
    professionalId: "professional-1",
    createdAt: "2099-01-12T10:00:00.000Z",
    updatedAt: "2099-01-12T10:00:00.000Z",
    diagnosis: "Colesterol",
    instructions: "Tomar de noche",
    validUntil: "2099-01-30",
    medications: [
      {
        name: "Atorvastatina",
        dose: "20 mg",
        frequency: "Nocturna",
        duration: "60 dias",
      },
    ],
    professional: {
      id: "professional-1",
      user: {
        id: "user-prof-1",
        name: "Ana",
        lastName: "Lopez",
        email: "ana@example.com",
        phone: null,
      },
    },
  },
  {
    id: "prescription-3",
    patientId: "patient-42",
    professionalId: "professional-3",
    createdAt: "2099-01-08T10:00:00.000Z",
    updatedAt: "2099-01-08T10:00:00.000Z",
    diagnosis: "Sin profesional",
    instructions: null,
    validUntil: null,
    medications: [
      {
        name: "Vitamina D",
        dose: "1 comprimido",
        frequency: null,
        duration: null,
      },
    ],
    professional: null,
  },
];

const allRecords = [
  {
    id: "record-1",
    patientId: "patient-42",
    professionalId: "professional-1",
    appointmentId: null,
    date: "2099-02-10",
    reason: "Control anual",
    diagnosis: "Apto",
    indications: "Continuar actividad fisica",
    evolution: "Sin novedades",
    nextCheckup: null,
    vitalSigns: {},
    createdAt: "2099-02-10T10:00:00.000Z",
    updatedAt: "2099-02-10T10:00:00.000Z",
    professional: {
      id: "professional-1",
      user: {
        id: "user-prof-1",
        name: "Ana",
        lastName: "Lopez",
        email: "ana@example.com",
        phone: null,
      },
    },
  },
  {
    id: "record-2",
    patientId: "patient-42",
    professionalId: "professional-2",
    appointmentId: null,
    date: "2099-03-12",
    reason: "Asma en seguimiento",
    diagnosis: "Asma estable",
    indications: "Usar broncodilatador",
    evolution: "Mejoria clinica",
    nextCheckup: null,
    vitalSigns: {},
    createdAt: "2099-03-12T10:00:00.000Z",
    updatedAt: "2099-03-12T10:00:00.000Z",
    professional: {
      id: "professional-2",
      user: {
        id: "user-prof-2",
        name: "Juan",
        lastName: "Perez",
        email: "juan@example.com",
        phone: null,
      },
    },
  },
  {
    id: "record-3",
    patientId: "patient-42",
    professionalId: null,
    appointmentId: null,
    date: "2099-01-05",
    reason: "Consulta sin profesional",
    diagnosis: "",
    indications: "",
    evolution: "",
    nextCheckup: null,
    vitalSigns: {},
    createdAt: "2099-01-05T10:00:00.000Z",
    updatedAt: "2099-01-05T10:00:00.000Z",
    professional: null,
  },
];

const allStudies = [
  {
    id: "study-1",
    patientId: "patient-42",
    professionalId: null,
    type: "Radiografia",
    date: "2099-03-02",
    results: "https://example.com/radiografia.pdf",
    fileUrl: "https://example.com/radiografia.jpg",
    notes: "Subido por paciente",
    createdAt: "2099-03-02T10:00:00.000Z",
    updatedAt: "2099-03-02T10:00:00.000Z",
    professional: null,
  },
  {
    id: "study-2",
    patientId: "patient-42",
    professionalId: "professional-1",
    type: "Laboratorio",
    date: "2099-03-15",
    results: "https://example.com/lab.pdf",
    fileUrl: null,
    notes: "Control metabolico",
    createdAt: "2099-03-15T10:00:00.000Z",
    updatedAt: "2099-03-15T10:00:00.000Z",
    professional: {
      id: "professional-1",
      user: {
        id: "user-prof-1",
        name: "Ana",
        lastName: "Lopez",
        email: "ana@example.com",
        phone: null,
      },
    },
  },
  {
    id: "study-3",
    patientId: "patient-42",
    professionalId: "professional-2",
    type: "Ecografia",
    date: "2099-03-10",
    results: null,
    fileUrl: null,
    notes: "Segundo profesional",
    createdAt: "2099-03-10T10:00:00.000Z",
    updatedAt: "2099-03-10T10:00:00.000Z",
    professional: {
      id: "professional-2",
      user: {
        id: "user-prof-2",
        name: "Bruno",
        lastName: "Alvarez",
        email: "bruno@example.com",
        phone: null,
      },
    },
  },
];

describe("patient pages", () => {
  beforeEach(() => {
    authMocks.useAuth.mockReset();
    prescriptionApiMocks.getPatientPrescriptions.mockReset();
    recordApiMocks.getPatientMedicalRecords.mockReset();
    studiesApiMocks.getPatientStudies.mockReset();
    studiesApiMocks.createStudy.mockReset();
    studiesApiMocks.updateStudy.mockReset();
    studiesApiMocks.deleteStudy.mockReset();
    modalHarness.studyEditorModalProps.length = 0;
    modalHarness.confirmDialogProps.length = 0;

    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        patientId: "patient-42",
      }),
    });
  });

  it("filters prescriptions by professional, validity and search", async () => {
    prescriptionApiMocks.getPatientPrescriptions.mockImplementation(
      async (_patientId: string, filters?: { professionalId?: string; valid?: boolean; search?: string }) => {
        let rows = [...allPrescriptions];

        if (filters?.professionalId) {
          rows = rows.filter((row) => row.professionalId === filters.professionalId);
        }
        if (filters?.valid) {
          rows = rows.filter((row) => row.validUntil === "2099-02-10");
        }
        if (filters?.search) {
          const term = filters.search.toLowerCase();
          rows = rows.filter(
            (row) =>
              row.diagnosis?.toLowerCase().includes(term) ||
              row.instructions?.toLowerCase().includes(term) ||
              row.medications.some((medication) => medication.name.toLowerCase().includes(term)),
          );
        }

        return rows;
      },
    );

    renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Levotiroxina")).toBeInTheDocument();
    });

    expect(screen.getByText("Atorvastatina")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Vigencia"), "valid");

    await waitFor(() => {
      expect(getLastCall(prescriptionApiMocks.getPatientPrescriptions)?.[1]).toMatchObject({
        valid: true,
      });
    });

    await userEvent.selectOptions(screen.getByLabelText("Profesional"), "professional-2");

    await waitFor(() => {
      expect(getLastCall(prescriptionApiMocks.getPatientPrescriptions)?.[1]).toMatchObject({
        professionalId: "professional-2",
        valid: true,
      });
    });

    const prescriptionSearch = screen.getByPlaceholderText(
      "Buscar por medicacion, diagnostico o indicaciones",
    );

    await userEvent.click(prescriptionSearch);
    await userEvent.paste("levot");

    await waitFor(() => {
      expect(getLastCall(prescriptionApiMocks.getPatientPrescriptions)?.[1]).toMatchObject({
        professionalId: "professional-2",
        valid: true,
        search: "levot",
      });
    });

    expect(screen.getByText("Levotiroxina")).toBeInTheDocument();
    expect(screen.queryByText("Atorvastatina")).not.toBeInTheDocument();
  }, 15_000);

  it("shows fallback prescription/record states and loading-error states", async () => {
    prescriptionApiMocks.getPatientPrescriptions
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockImplementationOnce(() => new Promise(() => undefined));

    const loadingPrescription = renderWithProviders(<PatientPrescriptionsPage />);
    expect(screen.getByText("Cargando recetas...")).toBeInTheDocument();
    loadingPrescription.unmount();

    prescriptionApiMocks.getPatientPrescriptions.mockReset();
    prescriptionApiMocks.getPatientPrescriptions.mockRejectedValue(new Error("boom"));

    renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar las recetas.")).toBeInTheDocument();
    });

    recordApiMocks.getPatientMedicalRecords
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockImplementationOnce(() => new Promise(() => undefined));

    const loadingRecords = renderWithProviders(<PatientRecordsPage />);
    expect(screen.getByText("Cargando registros...")).toBeInTheDocument();
    loadingRecords.unmount();

    recordApiMocks.getPatientMedicalRecords.mockReset();
    recordApiMocks.getPatientMedicalRecords.mockRejectedValue(new Error("boom"));

    renderWithProviders(<PatientRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tus registros.")).toBeInTheDocument();
    });
  });

  it("shows empty states for prescriptions and records", async () => {
    prescriptionApiMocks.getPatientPrescriptions.mockResolvedValue([]);

    const prescriptionsView = renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("No hay recetas para los filtros actuales.")).toBeInTheDocument();
    });

    prescriptionsView.unmount();

    recordApiMocks.getPatientMedicalRecords.mockResolvedValue([]);

    renderWithProviders(<PatientRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText("No hay registros para los filtros actuales.")).toBeInTheDocument();
    });
  });

  it("handles patient pages without patient ids and prescription rows without dose details", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        patientId: undefined,
      }),
    });

    const prescriptionsWithoutPatient = renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar las recetas.")).toBeInTheDocument();
    });

    prescriptionsWithoutPatient.unmount();

    const recordsWithoutPatient = renderWithProviders(<PatientRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar tus registros.")).toBeInTheDocument();
    });

    recordsWithoutPatient.unmount();

    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        patientId: "patient-42",
      }),
    });
    prescriptionApiMocks.getPatientPrescriptions.mockResolvedValue([
      {
        ...allPrescriptions[0],
        id: "prescription-no-dose",
        medications: [
          {
            name: "Ibuprofeno",
            dose: null,
            frequency: null,
            duration: null,
          },
        ],
      },
    ]);

    renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Sin detalle de dosis")).toBeInTheDocument();
    });
  });

  it("loads records and forwards professional, date and search filters", async () => {
    recordApiMocks.getPatientMedicalRecords.mockImplementation(
      async (
        _patientId: string,
        filters?: { professionalId?: string; startDate?: string; endDate?: string; search?: string },
      ) => {
        let rows = [...allRecords];

        if (filters?.professionalId) {
          rows = rows.filter((row) => row.professionalId === filters.professionalId);
        }
        if (filters?.startDate) {
          rows = rows.filter((row) => row.date >= filters.startDate!);
        }
        if (filters?.endDate) {
          rows = rows.filter((row) => row.date <= filters.endDate!);
        }
        if (filters?.search) {
          const term = filters.search.toLowerCase();
          rows = rows.filter(
            (row) =>
              row.reason.toLowerCase().includes(term) ||
              row.diagnosis.toLowerCase().includes(term) ||
              row.indications.toLowerCase().includes(term),
          );
        }

        return rows;
      },
    );

    renderWithProviders(<PatientRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText("Control anual")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("link", { name: "Abrir detalle" })[0]).toHaveAttribute(
      "href",
      "/patient/records/record-2",
    );

    await userEvent.selectOptions(screen.getByLabelText("Profesional"), "professional-2");
    const recordsSearch = screen.getByPlaceholderText(
      "Buscar por motivo, diagnostico o indicaciones",
    );

    await userEvent.click(recordsSearch);
    await userEvent.paste("asma");
    await userEvent.type(screen.getByLabelText("Desde"), "2099-03-01");
    await userEvent.type(screen.getByLabelText("Hasta"), "2099-03-31");

    await waitFor(() => {
      expect(getLastCall(recordApiMocks.getPatientMedicalRecords)?.[1]).toMatchObject({
        professionalId: "professional-2",
        startDate: "2099-03-01",
        endDate: "2099-03-31",
        search: "asma",
      });
    });

    expect(screen.getByText("Asma en seguimiento")).toBeInTheDocument();
    expect(screen.queryByText("Control anual")).not.toBeInTheDocument();
  });

  it("keeps fallback professional labels out of record filters", async () => {
    recordApiMocks.getPatientMedicalRecords.mockResolvedValue(allRecords);

    renderWithProviders(<PatientRecordsPage />);

    await waitFor(() => {
      expect(screen.getByText("Consulta sin profesional")).toBeInTheDocument();
    });

    const options = within(screen.getByLabelText("Profesional")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).not.toContain("Profesional");
  });

  it("filters studies client-side without refetching and executes create/update/delete flows", async () => {
    studiesApiMocks.getPatientStudies.mockResolvedValue(allStudies);
    studiesApiMocks.createStudy.mockResolvedValue({ id: "study-created" });
    studiesApiMocks.updateStudy.mockResolvedValue({ id: "study-2" });
    studiesApiMocks.deleteStudy.mockResolvedValue(undefined);

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Laboratorio")).toBeInTheDocument();
    });

    expect(studiesApiMocks.getPatientStudies).toHaveBeenCalledTimes(2);

    await userEvent.type(screen.getByPlaceholderText("Buscar por tipo, profesional o nota"), "metabolico");

    expect(studiesApiMocks.getPatientStudies).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Laboratorio")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);

    await userEvent.clear(screen.getByPlaceholderText("Buscar por tipo, profesional o nota"));

    await waitFor(() => {
      expect(screen.getByText("Laboratorio")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Agregar estudio" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear estudio mock" }));

    await waitFor(() => {
      expect(studiesApiMocks.createStudy).toHaveBeenCalledWith({
        patientId: "patient-42",
        professionalId: null,
        type: "Laboratorio",
        date: "2099-03-01",
        results: "https://example.com/report.pdf",
        fileUrl: "https://example.com/result-1.jpg",
      });
    });

    expect(screen.getByText("Estudio cargado correctamente.")).toBeInTheDocument();

    const labRow = screen.getByText("Laboratorio").closest(".list-row") as HTMLElement | null;
    expect(labRow).not.toBeNull();

    await userEvent.click(within(labRow!).getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar estudio editado" }));

    await waitFor(() => {
      expect(studiesApiMocks.updateStudy).toHaveBeenCalledWith("study-2", {
        type: "Laboratorio",
        date: "2099-03-01",
        results: "https://example.com/report.pdf",
        fileUrl: "https://example.com/result-1.jpg",
      });
    });

    expect(screen.getByText("Estudio actualizado correctamente.")).toBeInTheDocument();

    await userEvent.click(within(labRow!).getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Eliminar estudio" }));

    await waitFor(() => {
      expect(studiesApiMocks.deleteStudy).toHaveBeenCalledWith("study-2");
    });

    expect(screen.getByText("Estudio eliminado correctamente.")).toBeInTheDocument();
  });

  it("forwards server-side study filters and shows the empty state when nothing matches", async () => {
    studiesApiMocks.getPatientStudies.mockImplementation(
      async (
        _patientId: string,
        filters?: { professionalId?: string; type?: string; startDate?: string; endDate?: string },
      ) => {
        let rows = [...allStudies];

        if (filters?.professionalId) {
          rows = rows.filter((row) => row.professionalId === filters.professionalId);
        }
        if (filters?.type) {
          rows = rows.filter((row) => row.type === filters.type);
        }
        if (filters?.startDate) {
          rows = rows.filter((row) => row.date >= filters.startDate!);
        }
        if (filters?.endDate) {
          rows = rows.filter((row) => row.date <= filters.endDate!);
        }

        return rows;
      },
    );

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Radiografia").length).toBeGreaterThan(0);
    });

    await userEvent.selectOptions(screen.getByLabelText("Profesional"), "professional-1");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "Analisis de sangre");
    await userEvent.type(screen.getByLabelText("Desde"), "2099-03-20");
    await userEvent.type(screen.getByLabelText("Hasta"), "2099-03-31");

    await waitFor(() => {
      expect(getLastCall(studiesApiMocks.getPatientStudies)?.[1]).toMatchObject({
        professionalId: "professional-1",
        type: "Analisis de sangre",
        startDate: "2099-03-20",
        endDate: "2099-03-31",
      });
    });

    expect(screen.getByText("No hay estudios para los filtros actuales.")).toBeInTheDocument();
  });

  it("sorts study professionals alphabetically and keeps fallback prescription labels", async () => {
    studiesApiMocks.getPatientStudies.mockResolvedValue(allStudies);
    prescriptionApiMocks.getPatientPrescriptions.mockResolvedValue(allPrescriptions);

    const studiesView = renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Ecografia").length).toBeGreaterThan(0);
    });

    const studyOptions = within(screen.getByLabelText("Profesional")).getAllByRole("option");
    expect(studyOptions.map((option) => option.textContent)).toEqual([
      "Todos los profesionales",
      "Ana Lopez",
      "Bruno Alvarez",
    ]);

    studiesView.unmount();

    const prescriptionsView = renderWithProviders(<PatientPrescriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Vitamina D")).toBeInTheDocument();
    });

    const prescriptionOptions = within(screen.getByLabelText("Profesional")).getAllByRole("option");
    expect(prescriptionOptions.map((option) => option.textContent)).toContain("Profesional");

    prescriptionsView.unmount();
  });

  it("shows study mutation errors and closes create, edit and delete dialogs", async () => {
    studiesApiMocks.getPatientStudies.mockResolvedValue(allStudies);
    studiesApiMocks.createStudy.mockRejectedValue("fallo");
    studiesApiMocks.updateStudy.mockRejectedValue(new Error("No se pudo actualizar desde API."));
    studiesApiMocks.deleteStudy.mockRejectedValue("fallo");

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Laboratorio")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Agregar estudio" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear estudio mock" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo cargar el estudio.")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("No se pudo cargar el estudio.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar creacion estudio" }));
    expect(screen.queryByRole("button", { name: "Crear estudio mock" })).not.toBeInTheDocument();

    const labRow = screen.getByText("Laboratorio").closest(".list-row") as HTMLElement;
    await userEvent.click(within(labRow).getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar edicion estudio" }));
    expect(screen.queryByRole("button", { name: "Guardar estudio editado" })).not.toBeInTheDocument();

    await userEvent.click(within(labRow).getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar estudio editado" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo actualizar desde API.")).toBeInTheDocument();
    });

    await userEvent.click(within(labRow).getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar Eliminar estudio" }));
    expect(screen.queryByRole("button", { name: "Confirmar Eliminar estudio" })).not.toBeInTheDocument();

    await userEvent.click(within(labRow).getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Eliminar estudio" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo eliminar el estudio.")).toBeInTheDocument();
    });
  });

  it("handles alternate study mutation errors and defensive closed modal actions", async () => {
    studiesApiMocks.getPatientStudies.mockResolvedValue(allStudies);
    studiesApiMocks.createStudy.mockRejectedValue(new Error("No se pudo crear desde API."));
    studiesApiMocks.updateStudy.mockRejectedValue("fallo");
    studiesApiMocks.deleteStudy.mockRejectedValue(new Error("No se pudo borrar desde API."));

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Laboratorio")).toBeInTheDocument();
    });

    const closedEditModal = modalHarness.studyEditorModalProps.find(
      (props) => !props.isOpen && Object.prototype.hasOwnProperty.call(props, "study"),
    );
    expect(closedEditModal).toBeDefined();

    await act(async () => {
      await closedEditModal?.onSubmit({
        type: "Laboratorio",
        date: "2099-03-01",
        reportContent: "",
        attachmentContent: "",
      });
    });
    expect(studiesApiMocks.updateStudy).not.toHaveBeenCalled();

    const closedConfirmDialog = modalHarness.confirmDialogProps.find((props) => !props.isOpen);
    expect(closedConfirmDialog).toBeDefined();

    act(() => {
      closedConfirmDialog?.onConfirm();
    });
    expect(studiesApiMocks.deleteStudy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Agregar estudio" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear estudio mock" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo crear desde API.")).toBeInTheDocument();
    });

    const labRow = screen.getByText("Laboratorio").closest(".list-row") as HTMLElement;
    await userEvent.click(within(labRow).getByRole("button", { name: "Editar" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar estudio sin adjuntos" }));

    await waitFor(() => {
      expect(studiesApiMocks.updateStudy).toHaveBeenCalledWith("study-2", {
        type: "Laboratorio",
        date: "2099-03-01",
        results: undefined,
        fileUrl: undefined,
      });
    });
    expect(screen.getByText("No se pudo actualizar el estudio.")).toBeInTheDocument();

    await userEvent.click(within(labRow).getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Eliminar estudio" }));

    await waitFor(() => {
      expect(screen.getByText("No se pudo borrar desde API.")).toBeInTheDocument();
    });
  });

  it("shows loading and error states for studies", async () => {
    studiesApiMocks.getPatientStudies
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockImplementationOnce(() => new Promise(() => undefined));

    const { unmount } = renderWithProviders(<PatientStudiesPage />);
    expect(screen.getByText("Cargando estudios...")).toBeInTheDocument();
    unmount();

    studiesApiMocks.getPatientStudies.mockReset();
    studiesApiMocks.getPatientStudies.mockRejectedValue(new Error("boom"));

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar los estudios.")).toBeInTheDocument();
    });
  });

  it("handles studies without a patient id and study mutations with empty optional payload fields", async () => {
    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        patientId: undefined,
      }),
    });

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getByText("No pudimos cargar los estudios.")).toBeInTheDocument();
    });

    authMocks.useAuth.mockReturnValue({
      user: createSessionUser({
        role: "patient",
        patientId: "patient-42",
      }),
    });
    studiesApiMocks.getPatientStudies.mockResolvedValue([
      {
        ...allStudies[0],
        notes: null,
      },
    ]);
    studiesApiMocks.createStudy.mockResolvedValue({ id: "study-created-empty" });

    renderWithProviders(<PatientStudiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Radiografia").length).toBeGreaterThan(0);
    });

    await userEvent.type(screen.getByPlaceholderText("Buscar por tipo, profesional o nota"), "sin coincidencias");
    expect(screen.getByText("No hay estudios para los filtros actuales.")).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText("Buscar por tipo, profesional o nota"));
    await userEvent.click(screen.getByRole("button", { name: "Agregar estudio" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear estudio sin adjuntos" }));

    await waitFor(() => {
      expect(studiesApiMocks.createStudy).toHaveBeenCalledWith({
        patientId: "patient-42",
        professionalId: null,
        type: "Laboratorio",
        date: "2099-03-01",
        results: undefined,
        fileUrl: undefined,
      });
    });
  });
});
