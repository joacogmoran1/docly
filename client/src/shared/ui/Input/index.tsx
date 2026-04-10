import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <label className="form-field">
      {label ? <span className="field-label">{label}</span> : null}
      <input ref={ref} className={cn("input-base", className)} {...props} />
      {error ? <span className="field-error">{error}</span> : null}
      {!error && hint ? <span className="helper-text">{hint}</span> : null}
    </label>
  ),
);

Input.displayName = "Input";
