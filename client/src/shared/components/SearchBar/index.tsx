import { Search } from "lucide-react";
import { sanitizeSearchInput } from "@/shared/utils/sanitize";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function SearchBar({
  placeholder = "Buscar",
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="search-wrap">
      <Search size={18} />
      <input
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(sanitizeSearchInput(event.target.value))}
      />
    </div>
  );
}
