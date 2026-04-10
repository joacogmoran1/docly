import type { RouteObject } from "react-router-dom";
import { ProfessionalLayout } from "@/app/layouts/ProfessionalLayout";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { RoleGuard } from "@/app/guards/RoleGuard";
import { ProfessionalDashboardPage } from "@/modules/professional/dashboard/ProfessionalDashboardPage";
import { ProfessionalOfficesPage } from "@/modules/professional/offices/ProfessionalOfficesPage";
import { ProfessionalOfficeDetailPage } from "@/modules/professional/offices/ProfessionalOfficeDetailPage";
import { ProfessionalPatientDetailPage } from "@/modules/professional/patients/ProfessionalPatientDetailPage";
import { ProfessionalPatientPrescriptionDetailPage } from "@/modules/professional/patients/ProfessionalPatientPrescriptionDetailPage";
import { ProfessionalPatientRecordDetailPage } from "@/modules/professional/patients/ProfessionalPatientRecordDetailPage";
import { ProfessionalPatientStudyDetailPage } from "@/modules/professional/patients/ProfessionalPatientStudyDetailPage";
import { ProfessionalPatientsPage } from "@/modules/professional/patients/ProfessionalPatientsPage";
import { ProfessionalConsultationRecordPage } from "@/modules/professional/patients/ProfessionalConsultationRecordPage";
import { ProfessionalProfilePage } from "@/modules/professional/profile/ProfessionalProfilePage";
import { ProfessionalSchedulePage } from "@/modules/professional/schedule/ProfessionalSchedulePage";
import { ProfessionalSettingsPage } from "@/modules/professional/settings/ProfessionalSettingsPage";

export const professionalRoutes: RouteObject = {
  path: "professional",
  element: <RoleGuard allowedRoles={["professional"]} />,
  children: [
    {
      element: <ProfessionalLayout />,
      children: [
        { index: true, element: <ProfessionalDashboardPage /> },
        {
          element: <PermissionGuard permission="patients:read" />,
          children: [
            { path: "patients", element: <ProfessionalPatientsPage /> },
            { path: "patients/:patientId", element: <ProfessionalPatientDetailPage /> },
            { path: "patients/:patientId/records/:recordId", element: <ProfessionalPatientRecordDetailPage /> },
            { path: "patients/:patientId/studies/:studyId", element: <ProfessionalPatientStudyDetailPage /> },
            {
              path: "patients/:patientId/prescriptions/:prescriptionId",
              element: <ProfessionalPatientPrescriptionDetailPage />,
            },
          ],
        },
        {
          element: <PermissionGuard permission="records:write" />,
          children: [{ path: "patients/new-record", element: <ProfessionalConsultationRecordPage /> }],
        },
        { path: "offices", element: <ProfessionalOfficesPage /> },
        { path: "offices/:officeId", element: <ProfessionalOfficeDetailPage /> },
        { path: "schedule", element: <ProfessionalSchedulePage /> },
        { path: "profile", element: <ProfessionalProfilePage /> },
        { path: "settings", element: <ProfessionalSettingsPage /> },
      ],
    },
  ],
};
