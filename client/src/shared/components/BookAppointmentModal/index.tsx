import { useMemo, useState } from "react";
import { SearchBar } from "@/shared/components/SearchBar";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

interface BookAppointmentModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  patients: { id: string; fullName: string; meta: string }[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (patientId: string) => Promise<void> | void;
}

export function BookAppointmentModal({
  isOpen,
  title,
  description,
  patients,
  isSubmitting = false,
  onClose,
  onConfirm,
}: BookAppointmentModalProps) {
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");

  const filtered = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.fullName.toLowerCase().includes(search.toLowerCase()) ||
          patient.meta.toLowerCase().includes(search.toLowerCase()),
      ),
    [patients, search],
  );

  const options = filtered.map((patient) => ({
    value: patient.id,
    label: `${patient.fullName} - ${patient.meta}`,
  }));

  const handleClose = () => {
    setSearch("");
    setPatientId("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!patientId) return;
    await onConfirm(patientId);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} title={title} description={description} onClose={handleClose}>
      <div className="minimal-form">
        <SearchBar placeholder="Buscar paciente" value={search} onChange={setSearch} />
        <Select
          label="Paciente"
          options={options}
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
        />
        <div className="form-actions">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!patientId || isSubmitting}>
            {isSubmitting ? "Agendando..." : "Agendar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
