import { useState } from "react";

export function useDisclosure(initialValue = false) {
  const [isOpen, setIsOpen] = useState(initialValue);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((current) => !current),
  };
}
