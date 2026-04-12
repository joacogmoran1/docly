import { forwardRef, type SelectHTMLAttributes } from "react";
import type { SelectOption } from "@/shared/types/common";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, ...props }, ref) => (
    <label className="form-field">
      {label ? <span className="field-label">{label}</span> : null}
      <select ref={ref} className="select-base" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  ),
);

Select.displayName = "Select";
