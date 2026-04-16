import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
	createProfessionalOffice,
	deleteProfessionalOffice,
	getProfessionalOffices,
} from "@/modules/professional/api/professional.api";
import { useAuth } from "@/app/providers/AuthProvider";
import { CreateOfficeModal } from "@/modules/professional/offices/CreateOfficeModal";
import { queryKeys } from "@/shared/constants/query-keys";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ListEntry } from "@/shared/components/ListEntry";
import { SearchBar } from "@/shared/components/SearchBar";
import { Button } from "@/shared/ui/Button";
import type { OfficeItem } from "@/shared/types/domain";

export function ProfessionalOfficesPage() {
	const { user } = useAuth();
	const queryClient = useQueryClient();
	const professionalId = user?.professionalId ?? "";
	const [search, setSearch] = useState("");
	const [isCreatingOffice, setIsCreatingOffice] = useState(false);
	const [officeToDelete, setOfficeToDelete] = useState<OfficeItem | null>(null);
	const [feedback, setFeedback] = useState<{
		tone: "success" | "error";
		message: string;
	} | null>(null);
	const query = useQuery({
		queryKey: [...queryKeys.professionalOffices, professionalId],
		queryFn: () => getProfessionalOffices(professionalId),
		enabled: Boolean(professionalId),
	});
	const createOfficeMutation = useMutation({
		mutationFn: (values: {
			name: string;
			address: string;
			phone: string;
		}) =>
			createProfessionalOffice({
				professionalId,
				name: values.name.trim(),
				address: values.address.trim(),
				phone: values.phone.trim() || undefined,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [...queryKeys.professionalOffices, professionalId],
			});
			setIsCreatingOffice(false);
			setFeedback({ tone: "success", message: "Consultorio creado exitosamente." });
		},
		onError: (error) => {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "No se pudo crear el consultorio.",
			});
		},
	});
	const deleteOfficeMutation = useMutation({
		mutationFn: (officeId: string) => deleteProfessionalOffice(officeId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [...queryKeys.professionalOffices, professionalId],
			});
			setFeedback({
				tone: "success",
				message: `Consultorio "${officeToDelete?.name}" eliminado exitosamente.`,
			});
			setOfficeToDelete(null);
		},
		onError: (error) => {
			setFeedback({
				tone: "error",
				message: error instanceof Error ? error.message : "No se pudo eliminar el consultorio.",
			});
			setOfficeToDelete(null);
		},
	});

	const rows = useMemo(() => {
		const items = query.data ?? [];
		return items.filter(
			(office) =>
				office.name.toLowerCase().includes(search.toLowerCase()) ||
				office.address.toLowerCase().includes(search.toLowerCase()),
		);
	}, [query.data, search]);

	if (query.isLoading) return <div className="centered-feedback">Cargando consultorios...</div>;
	if (query.isError || !query.data) {
		return <div className="centered-feedback">No pudimos cargar consultorios.</div>;
	}

	return (
		<div className="page-stack">
			{feedback ? (
				<div className={`feedback-banner${feedback.tone === "error" ? " is-error" : " is-success"}`}>
					<span>{feedback.message}</span>
					<Button variant="ghost" className="button-inline" onClick={() => setFeedback(null)}>
						Cerrar
					</Button>
				</div>
			) : null}

			<div className="dashboard-plain-header">
				<h1 className="title-lg">Consultorios</h1>
				<div className="offices-toolbar">
					<SearchBar placeholder="Buscar consultorio" value={search} onChange={setSearch} />
					<Button className="button-inline" onClick={() => setIsCreatingOffice(true)}>
						Crear consultorio
					</Button>
				</div>
			</div>

			<div className="dashboard-plain-list">
				{rows.map((office) => (
					<ListEntry
						key={office.id}
						title={office.name}
						className="office-entry"
						action={
							<div className="row-wrap">
								<Link to={`/professional/offices/${office.id}`}>
									<Button>Ver consultorio</Button>
								</Link>
								<Button
									variant="danger"
									onClick={() => setOfficeToDelete(office)}
								>
									Eliminar
								</Button>
							</div>
						}
					>
						<span className="slot-entry-meta">{office.address}</span>
						{office.days ? (
							<span className="slot-entry-meta">{office.days} · {office.appointmentDuration}</span>
						) : null}
					</ListEntry>
				))}

				{!rows.length ? <span className="meta">No encontramos consultorios para esa busqueda.</span> : null}
			</div>

			<CreateOfficeModal
				isOpen={isCreatingOffice}
				isSubmitting={createOfficeMutation.isPending}
				onClose={() => setIsCreatingOffice(false)}
				onSubmit={async (values) => {
					await createOfficeMutation.mutateAsync(values);
				}}
			/>

			<ConfirmDialog
				isOpen={Boolean(officeToDelete)}
				title="Eliminar consultorio"
				description={
					officeToDelete
						? `Se eliminara el consultorio "${officeToDelete.name}" con todos sus horarios y turnos asociados. Esta accion no se puede deshacer.`
						: ""
				}
				tone="danger"
				confirmLabel={deleteOfficeMutation.isPending ? "Eliminando..." : "Eliminar consultorio"}
				onClose={() => setOfficeToDelete(null)}
				onConfirm={() => {
					if (!officeToDelete || deleteOfficeMutation.isPending) return;
					deleteOfficeMutation.mutate(officeToDelete.id);
				}}
			/>
		</div>
	);
}