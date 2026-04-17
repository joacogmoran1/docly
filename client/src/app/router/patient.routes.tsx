import type { RouteObject } from "react-router-dom";
import { PatientLayout } from "@/app/layouts/PatientLayout";
import { RoleGuard } from "@/app/guards/RoleGuard";
import { PatientAppointmentsPage } from "@/modules/patient/appointments/PatientAppointmentsPage";
import { PatientDashboardPage } from "@/modules/patient/dashboard/PatientDashboardPage";
import { PatientHealthPage } from "@/modules/patient/health/PatientHealthPage";
import { PatientHealthDetailPage } from "@/modules/patient/health/PatientHealthDetailPage";
import { PatientPrescriptionsPage } from "@/modules/patient/prescriptions/PatientPrescriptionsPage";
import { PatientPrescriptionDetailPage } from "@/modules/patient/prescriptions/PatientPrescriptionDetailPage";
import { PatientProfessionalsPage } from "@/modules/patient/professionals/PatientProfessionalsPage";
import { PatientProfessionalDetailPage } from "@/modules/patient/professionals/PatientProfessionalDetailPage";
import { PatientProfessionalRecordDetailPage } from "@/modules/patient/professionals/PatientProfessionalRecordDetailPage";
import { PatientProfilePage } from "@/modules/patient/profile/PatientProfilePage";
import { PatientRecordDetailPage } from "@/modules/patient/records/PatientRecordDetailPage";
import { PatientRecordsPage } from "@/modules/patient/records/PatientRecordsPage";
import { PatientSettingsPage } from "@/modules/patient/settings/PatientSettingsPage";
import { PatientStudiesPage } from "@/modules/patient/studies/PatientStudiesPage";
import { PatientStudyDetailPage } from "@/modules/patient/studies/PatientStudyDetailPage";

export const patientRoutes: RouteObject = {
  path: "patient",
  element: <RoleGuard allowedRoles={["patient"]} />,
  children: [
    {
      element: <PatientLayout />,
      children: [
        { index: true, element: <PatientDashboardPage /> },
        { path: "appointments", element: <PatientAppointmentsPage /> },
        { path: "records", element: <PatientRecordsPage /> },
        { path: "records/:recordId", element: <PatientRecordDetailPage /> },
        { path: "studies", element: <PatientStudiesPage /> },
        { path: "prescriptions", element: <PatientPrescriptionsPage /> },
        { path: "professionals", element: <PatientProfessionalsPage /> },
        { path: "professionals/:professionalId", element: <PatientProfessionalDetailPage /> },
        {
          path: "professionals/:professionalId/records/:recordId",
          element: <PatientProfessionalRecordDetailPage />,
        },
        { path: "health", element: <PatientHealthPage /> },
        { path: "health/:sectionId", element: <PatientHealthDetailPage /> },
        { path: "studies/:studyId", element: <PatientStudyDetailPage /> },
        { path: "prescriptions/:prescriptionId", element: <PatientPrescriptionDetailPage /> },
        { path: "profile", element: <PatientProfilePage /> },
        { path: "settings", element: <PatientSettingsPage /> },
      ],
    },
  ],
};
