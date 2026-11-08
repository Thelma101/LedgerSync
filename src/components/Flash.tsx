export default function Flash({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] bg-[var(--secondary)] border border-[var(--border)] px-5 py-3 font-mono text-[11px] text-[var(--foreground)] shadow-lg"
    >
      {message}
    </div>
  );
}
