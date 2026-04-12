import { Outlet } from "react-router-dom";
import { AppShell } from "@/shared/components/AppShell";
import { professionalNavigation } from "@/shared/constants/navigation";

export function ProfessionalLayout() {
  return (
    <AppShell title="Docly" subtitle="Profesional" items={professionalNavigation}>
        <Outlet />
    </AppShell>
  );
}
