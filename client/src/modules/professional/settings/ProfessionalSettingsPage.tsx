import { useAuth } from "@/app/providers/AuthProvider";
import { ChangeEmailCard } from "@/modules/auth/components/ChangeEmailCard";
import { ChangePasswordCard } from "@/modules/auth/components/ChangePasswordCard";
import { DeleteAccountCard } from "@/modules/auth/components/DeleteAccountCard";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export function ProfessionalSettingsPage() {
	const { logout } = useAuth();

	return (
		<div className="page-stack">
			<div className="dashboard-plain-header">
				<h1 className="title-lg">Configuracion</h1>
			</div>

			<div className="settings-layout">
				<div className="settings-main-column">
					<ChangeEmailCard />
					<ChangePasswordCard />
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

					<DeleteAccountCard />
				</aside>
			</div>
		</div>
	);
}