import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/providers/AuthProvider";
import { ChangePasswordCard } from "@/modules/auth/components/ChangePasswordCard";
import {
  getPatientTeamProfessionals,
  removeProfessionalFromTeam,
} from "@/modules/patient/api/patient.api";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

export function PatientSettingsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const patientId = user?.patientId ?? "";
  const permissionsQuery = useQuery({
    queryKey: [...queryKeys.patientProfessionals, patientId, "settings"],
    queryFn: () => getPatientTeamProfessionals(patientId),
    enabled: Boolean(patientId),
  });
  const revokeMutation = useMutation({
    mutationFn: (professionalId: string) => removeProfessionalFromTeam(patientId, professionalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.patientProfessionals, patientId],
      });
    },
  });

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Configuracion</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-main-column">
          <Card
            title="Datos de la cuenta"
            description="Mail de acceso y cambio de contrasena."
            className="panel-separated"
          >
            <div className="minimal-form">
              <Input label="Email" value={user?.email ?? ""} disabled />
              <Input label="Rol" value={user?.role ?? ""} disabled />
            </div>
          </Card>

          <ChangePasswordCard />

          <Card
            title="Permisos otorgados"
            description="Profesionales que pueden acceder a tu informacion."
            className="panel-separated"
          >
            {permissionsQuery.isLoading ? (
              <span className="meta">Cargando permisos...</span>
            ) : permissionsQuery.isError ? (
              <span className="field-error">No pudimos cargar los permisos otorgados.</span>
            ) : (
              <div className="plain-list">
                {(permissionsQuery.data ?? []).map((professional) => (
                  <div key={professional.id} className="list-row">
                    <div className="stack-sm">
                      <strong>{professional.fullName}</strong>
                      <span className="meta">
                        {[professional.specialty, professional.bio].filter(Boolean).join(" - ")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(professional.id)}
                    >
                      Revocar
                    </Button>
                  </div>
                ))}
                {!permissionsQuery.data?.length ? (
                  <span className="meta">Todavia no autorizaste profesionales desde tu equipo.</span>
                ) : null}
              </div>
            )}
          </Card>
        </div>

        <aside className="settings-side-column">
          <Card title="Sesion" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">Cierra la sesion activa de este dispositivo.</p>
              <Button variant="ghost" fullWidth onClick={() => void logout()}>
                Cerrar sesion
              </Button>
            </div>
          </Card>

          <Card title="Eliminar cuenta" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">
                Esta accion todavia no esta disponible desde el frontend conectado al backend.
              </p>
              <Button variant="danger" fullWidth disabled>
                Eliminar cuenta
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
