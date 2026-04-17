import { useEffect, useState } from "react";
import {
  ProfessionalPatientSelector,
  type ProfessionalSelectablePatient,
} from "@/modules/professional/patients/ProfessionalPatientSelector";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";

interface BookAppointmentModalProps {
  isOpen: boolean;
  professionalId: string;
  title: string;
  description?: string;
  newPatientMessage?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (patient: ProfessionalSelectablePatient) => Promise<void> | void;
}

export function BookAppointmentModal({
  isOpen,
  professionalId,
  title,
  description,
  newPatientMessage,
  isSubmitting = false,
  onClose,
  onConfirm,
}: BookAppointmentModalProps) {
  const [selectedPatient, setSelectedPatient] = useState<ProfessionalSelectablePatient | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPatient(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSelectedPatient(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedPatient) return;
    await onConfirm(selectedPatient);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} title={title} description={description} onClose={handleClose}>
      <div className="minimal-form">
        <ProfessionalPatientSelector
          professionalId={professionalId}
          value={selectedPatient?.id ?? ""}
          onChange={setSelectedPatient}
          disabled={isSubmitting}
          autoSelectFirst
          newPatientMessage={
            newPatientMessage ??
            "Solo puedes agendar turnos para pacientes ya vinculados."
          }
        />
        <div className="form-actions">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!selectedPatient || isSubmitting}>
            {isSubmitting ? "Agendando..." : "Agendar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
