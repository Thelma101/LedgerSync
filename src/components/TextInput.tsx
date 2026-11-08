import { useFieldId } from "./fieldContext";

export const fieldClass =
  "w-full bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 outline-none focus:border-[var(--primary)] placeholder-[var(--muted-foreground)] transition-colors aria-[invalid=true]:border-[var(--status-mismatch)]";

export default function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly,
  required,
  id,
  ariaLabel,
  ariaInvalid,
  min,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  min?: string;
}) {
  const fieldId = useFieldId(id);
  return (
    <input
      id={fieldId}
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      min={min}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid || undefined}
      className={`${fieldClass} ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
    />
  );
}
