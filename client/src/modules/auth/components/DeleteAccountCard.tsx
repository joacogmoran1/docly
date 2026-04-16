import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { deleteAccount } from "@/modules/auth/api/auth.api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

export function DeleteAccountCard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!password.trim() || isDeleting) return;

    try {
      setIsDeleting(true);
      setServerError(null);
      await deleteAccount(password);
      await logout();
      navigate("/auth/login", { replace: true });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "No se pudo eliminar la cuenta.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card title="Eliminar cuenta" className="panel-separated settings-action-card">
        <div className="stack-md">
          <p className="meta">
            Tu cuenta sera desactivada y no podras acceder mas a la plataforma.
            Esta accion no se puede deshacer.
          </p>
          <Button variant="danger" fullWidth onClick={() => setIsOpen(true)}>
            Eliminar cuenta
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isOpen}
        title="Eliminar cuenta"
        description="Esta accion desactivara tu cuenta de forma permanente. Ingresa tu contrasena para confirmar."
        tone="danger"
        confirmLabel={isDeleting ? "Eliminando..." : "Eliminar mi cuenta"}
        onClose={() => {
          setIsOpen(false);
          setPassword("");
          setServerError(null);
        }}
        onConfirm={() => void handleDelete()}
      >
        <div className="stack-md">
          <Input
            label="Contrasena"
            type="password"
            placeholder="Ingresa tu contrasena"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {serverError ? <span className="field-error">{serverError}</span> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
