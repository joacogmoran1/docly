import { Outlet } from "react-router-dom";
import { AppShell } from "@/shared/components/AppShell";
import { patientNavigation } from "@/shared/constants/navigation";

export function PatientLayout() {
  return (
    <AppShell title="Docly" subtitle="Paciente" items={patientNavigation}>
        <Outlet />
    </AppShell>
  );
}
