import { LogOut } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Button } from "@/shared/ui/Button";

interface TopbarProps {
  contextLabel?: string;
}

export function Topbar({ contextLabel }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="stack-sm">
        <strong>{user?.fullName}</strong>
        {contextLabel ? <span className="meta">{contextLabel}</span> : null}
      </div>

      <div className="row">
        <Button variant="ghost" onClick={logout} data-testid="topbar-logout">
          <LogOut size={16} />
          Salir
        </Button>
      </div>
    </header>
  );
}
