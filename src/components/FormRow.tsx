import { useId, type ReactNode } from "react";
import { FieldIdContext } from "./fieldContext";

export default function FormRow({
  label,
  children,
  note,
  required,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  note?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] items-start gap-1.5 sm:gap-4 py-3 border-b border-[var(--border)] last:border-b-0">
      <div className="sm:pt-2">
        <label htmlFor={id} className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest block">
          {label}
          {required && <span className="text-[var(--status-mismatch)] ml-0.5" aria-hidden="true">*</span>}
        </label>
        {note && <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-snug opacity-80">{note}</div>}
      </div>
      <FieldIdContext.Provider value={id}>
        <div className="min-w-0">{children}</div>
      </FieldIdContext.Provider>
    </div>
  );
}
