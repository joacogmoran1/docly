import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPatientSettingsMock } from "@/mocks/docly-api";
import { useAuth } from "@/app/providers/AuthProvider";
import { queryKeys } from "@/shared/constants/query-keys";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

export function PatientSettingsPage() {
  const { logout } = useAuth();
  const [editingAccount, setEditingAccount] = useState(false);
  const query = useQuery({
    queryKey: queryKeys.patientSettings,
    queryFn: getPatientSettingsMock,
  });

  if (query.isLoading) return <div className="centered-feedback">Cargando configuracion...</div>;
  if (query.isError || !query.data) return <div className="centered-feedback">No pudimos cargar la configuracion.</div>;

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
            action={
              <div className="form-actions">
                {editingAccount ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditingAccount(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setEditingAccount(false)}>Guardar</Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setEditingAccount(true)}>
                    Editar
                  </Button>
                )}
              </div>
            }
          >
            <div className="minimal-form">
              <Input label="Email" defaultValue={query.data.email} disabled={!editingAccount} />
              <Input label="Nueva contrasena" type="password" disabled={!editingAccount} />
              <Input label="Confirmar contrasena" type="password" disabled={!editingAccount} />
            </div>
          </Card>

          <Card
            title="Permisos otorgados"
            description="Profesionales que pueden acceder a tu informacion."
            className="panel-separated"
          >
            <div className="plain-list">
              {query.data.permissions.map((permission) => (
                <div key={permission.id} className="list-row">
                  <div className="stack-sm">
                    <strong>{permission.professional}</strong>
                    <span className="meta">{permission.scope}</span>
                  </div>
                  <Button variant="ghost">Revocar</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="settings-side-column">
          <Card title="Sesion" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">Cierra la sesion activa de este dispositivo.</p>
              <Button variant="ghost" fullWidth onClick={logout}>
                Cerrar sesion
              </Button>
            </div>
          </Card>

          <Card title="Eliminar cuenta" className="panel-separated settings-action-card">
            <div className="stack-md">
              <p className="meta">Accion permanente. Tus datos dejaran de estar disponibles.</p>
              <Button variant="danger" fullWidth>
                Eliminar cuenta
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
