import { useMemo, useState } from "react";
import { SearchBar } from "@/shared/components/SearchBar";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";

interface BookAppointmentModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  patients: { id: string; fullName: string; document: string }[];
  onClose: () => void;
}

export function BookAppointmentModal({
  isOpen,
  title,
  description,
  patients,
  onClose,
}: BookAppointmentModalProps) {
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");

  const filtered = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.fullName.toLowerCase().includes(search.toLowerCase()) ||
          patient.document.includes(search),
      ),
    [patients, search],
  );

  return (
    <Modal isOpen={isOpen} title={title} description={description} onClose={onClose}>
      <div className="minimal-form">
        <SearchBar placeholder="Buscar paciente" value={search} onChange={setSearch} />
        <Select
          label="Paciente"
          options={filtered.map((patient) => ({
            value: patient.id,
            label: `${patient.fullName} - ${patient.document}`,
          }))}
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
        />
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose} disabled={!patientId}>
            Agendar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
