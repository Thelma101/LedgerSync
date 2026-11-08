export default function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 w-8 h-4 relative transition-colors border shrink-0 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)] ${
          checked ? "bg-[var(--primary)]/20 border-[var(--primary)]" : "bg-[var(--secondary)] border-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-2.5 h-2.5 transition-all ${
            checked ? "left-[18px] bg-[var(--primary)]" : "left-0.5 bg-[var(--muted-foreground)]"
          }`}
        />
      </span>
      <span>
        <span className="block font-mono text-[11px] text-[var(--foreground)]">{label}</span>
        {description && <span className="block font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5">{description}</span>}
      </span>
    </label>
  );
}
