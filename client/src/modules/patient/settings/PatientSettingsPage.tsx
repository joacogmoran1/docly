import { useAuth } from "@/app/providers/AuthProvider";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

export function PatientSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="page-stack">
      <div className="dashboard-plain-header">
        <h1 className="title-lg">Configuracion</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-main-column">
          <Card
            title="Datos de la cuenta"
            description="La API documentada solo expone autenticacion basica por ahora."
            className="panel-separated"
          >
            <div className="minimal-form">
              <Input label="Email" value={user?.email ?? ""} disabled />
              <Input label="Rol" value={user?.role ?? ""} disabled />
            </div>
          </Card>

          <Card
            title="Permisos otorgados"
            description="La documentacion del backend no incluye todavia la administracion de permisos finos desde esta vista."
            className="panel-separated"
          >
            <p className="meta">
              Cuando el backend exponga ese contrato, podemos conectar esta pantalla sin inventar datos.
            </p>
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
        </aside>
      </div>
    </div>
  );
}
