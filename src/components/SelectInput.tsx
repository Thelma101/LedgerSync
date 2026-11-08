import type { ReactNode } from "react";
import { useFieldId } from "./fieldContext";
import { fieldClass } from "./TextInput";

export default function SelectInput({
  value,
  onChange,
  children,
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
}) {
  const fieldId = useFieldId(id);
  return (
    <div className="relative">
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`${fieldClass} appearance-none cursor-pointer pr-8`}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[var(--muted-foreground)]"
      >
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
