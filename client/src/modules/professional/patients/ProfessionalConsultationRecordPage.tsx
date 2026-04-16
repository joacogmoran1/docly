import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getProfessionalPatients } from "@/modules/professional/api/professional.api";
import { ConsultationRecordComposer } from "@/modules/professional/patients/ConsultationRecordComposer";
import { queryKeys } from "@/shared/constants/query-keys";
import { SearchBar } from "@/shared/components/SearchBar";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

export function ProfessionalConsultationRecordPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const professionalId = user?.professionalId ?? "";
	const [search, setSearch] = useState("");
	const [selectedPatientId, setSelectedPatientId] = useState("");
	const [isComposing, setIsComposing] = useState(false);

	const patientsQuery = useQuery({
		queryKey: [...queryKeys.professionalPatients, professionalId, "new-record"],
		queryFn: () => getProfessionalPatients(professionalId),
		enabled: Boolean(professionalId),
	});

	const filteredPatients = useMemo(() => {
		const patients = patientsQuery.data ?? [];
		if (!search) return patients;
		const term = search.toLowerCase();
		return patients.filter(
			(p) =>
				p.fullName.toLowerCase().includes(term) ||
				(p.email ?? "").toLowerCase().includes(term) ||
				p.document.toLowerCase().includes(term),
		);
	}, [patientsQuery.data, search]);

	const patientOptions = useMemo(
		() =>
			filteredPatients.map((p) => ({
				value: p.id,
				label: `${p.fullName} — ${p.email ?? p.document}`,
			})),
		[filteredPatients],
	);

	const selectedPatient = useMemo(
		() => (patientsQuery.data ?? []).find((p) => p.id === selectedPatientId),
		[patientsQuery.data, selectedPatientId],
	);

	const handleStartComposing = () => {
		if (!selectedPatientId) return;
		setIsComposing(true);
	};

	const handleSuccess = () => {
		navigate(`/professional/patients/${selectedPatientId}?tab=records`);
	};

	const handleCancel = () => {
		setIsComposing(false);
	};

	if (patientsQuery.isLoading) {
		return <div className="centered-feedback">Cargando pacientes...</div>;
	}
	if (patientsQuery.isError) {
		return <div className="centered-feedback">No pudimos cargar los pacientes.</div>;
	}

	return (
		<div className="page-stack">
			<div className="subpage-header">
				<Button variant="ghost" onClick={() => navigate(-1)}>
					<ArrowLeft size={16} />
					Volver
				</Button>
			</div>

			{isComposing && selectedPatient ? (
				<Card
					title="Nuevo registro medico"
					description={`Paciente: ${selectedPatient.fullName}`}
					className="panel-separated"
				>
					<ConsultationRecordComposer
						patientId={selectedPatientId}
						onCancel={handleCancel}
						onSuccess={handleSuccess}
					/>
				</Card>
			) : (
				<Card
					title="Crear registro medico"
					description="Selecciona un paciente de tu listado para crear un nuevo registro de consulta."
					className="panel-separated"
				>
					<div className="minimal-form">
						<SearchBar
							placeholder="Buscar paciente por nombre o contacto"
							value={search}
							onChange={setSearch}
						/>

						<Select
							label="Paciente"
							options={
								patientOptions.length
									? [{ value: "", label: "Seleccionar paciente" }, ...patientOptions]
									: [{ value: "", label: "No hay pacientes disponibles" }]
							}
							value={selectedPatientId}
							onChange={(event) => setSelectedPatientId(event.target.value)}
						/>

						{selectedPatient ? (
							<div className="stack-sm">
								<span className="meta">
									{selectedPatient.coverage} — {selectedPatient.email ?? selectedPatient.document}
								</span>
								{selectedPatient.lastVisit ? (
									<span className="meta">Ultimo turno: {selectedPatient.lastVisit}</span>
								) : null}
							</div>
						) : null}

						<div className="form-actions">
							<Button
								onClick={handleStartComposing}
								disabled={!selectedPatientId}
							>
								Continuar
							</Button>
						</div>

						{!patientOptions.length && !search ? (
							<span className="meta">
								Todavia no tenes pacientes asociados. Los pacientes aparecen despues de su primer turno, receta o registro.
							</span>
						) : null}
					</div>
				</Card>
			)}
		</div>
	);
}
