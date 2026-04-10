import type { PropsWithChildren } from "react";
import { Button } from "@/shared/ui/Button";

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}

export function Modal({
  isOpen,
  title,
  description,
  onClose,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel stack-md" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="stack-sm">
            <h3 className="title-lg">{title}</h3>
            {description ? <p className="meta">{description}</p> : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
