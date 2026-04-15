import { useEffect, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

interface CreateOfficeValues {
  name: string;
  address: string;
  phone: string;
}

interface CreateOfficeModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateOfficeValues) => Promise<void> | void;
}

const initialValues: CreateOfficeValues = {
  name: "",
  address: "",
  phone: "",
};

export function CreateOfficeModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CreateOfficeModalProps) {
  const [values, setValues] = useState<CreateOfficeValues>(initialValues);

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
    }
  }, [isOpen]);

  const updateValue = (field: keyof CreateOfficeValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const isInvalid = !values.name.trim() || !values.address.trim();

  return (
    <Modal
      isOpen={isOpen}
      title="Crear consultorio"
      description="Carga los datos principales. Los dias y horarios se configuran despues desde la subpagina."
      onClose={onClose}
    >
      <div className="minimal-form">
        <Input
          label="Nombre"
          value={values.name}
          placeholder="Consultorio Centro"
          onChange={(event) => updateValue("name", event.target.value)}
        />
        <Input
          label="Direccion"
          value={values.address}
          placeholder="Av. Corrientes 1234, CABA"
          onChange={(event) => updateValue("address", event.target.value)}
        />
        <Input
          label="Telefono"
          value={values.phone}
          placeholder="+54 11 ..."
          onChange={(event) => updateValue("phone", event.target.value)}
        />
        <div className="form-actions">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void onSubmit(values)}
            disabled={isInvalid || isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear consultorio"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
