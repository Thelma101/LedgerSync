import { useState } from "react";

export interface NewRunConfig {
  ledgerFile: string;
  settlementFile: string;
  runDate: string;
}

export default function NewRunModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (config: NewRunConfig) => void;
}) {
  const [ledgerFile, setLedgerFile] = useState("");
  const [settlementFile, setSettlementFile] = useState("");
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));

  const canSubmit = ledgerFile.trim() !== "" && settlementFile.trim() !== "" && runDate !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ ledgerFile: ledgerFile.trim(), settlementFile: settlementFile.trim(), runDate });
  }

  const inputClass =
    "w-full bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 outline-none focus:border-[var(--primary)] placeholder-[var(--muted-foreground)] transition-colors";
  const labelClass = "block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-run-title"
        className="relative w-[480px] max-w-[calc(100vw-2rem)] bg-[#0d1117] border border-[var(--border)]"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div id="new-run-title" className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-widest">
            New Reconciliation Run
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="run-date" className={labelClass}>Run Date</label>
            <input id="run-date" type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ledger-file" className={labelClass}>Ledger File</label>
            <input
              id="ledger-file"
              value={ledgerFile}
              onChange={(e) => setLedgerFile(e.target.value)}
              placeholder="ledger_2026-08-25.csv"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="settlement-file" className={labelClass}>Settlement File</label>
            <input
              id="settlement-file"
              value={settlementFile}
              onChange={(e) => setSettlementFile(e.target.value)}
              placeholder="nibss_eft_20260825.txt"
              className={inputClass}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="font-mono text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            START RUN
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-1.5 hover:bg-[var(--secondary)] transition-colors"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}
