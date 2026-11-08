import { useState } from "react";
import Dialog from "./Dialog";
import TextInput from "./TextInput";
import { todayInZone } from "../lib/datetime";

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
  const [runDate, setRunDate] = useState(todayInZone());

  const canSubmit = ledgerFile.trim() !== "" && settlementFile.trim() !== "" && runDate !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ ledgerFile: ledgerFile.trim(), settlementFile: settlementFile.trim(), runDate });
  }

  const labelClass = "block font-mono text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1";

  return (
    <Dialog onClose={onClose} labelledBy="new-run-title" className="max-w-[480px]">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <h2 id="new-run-title" className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-widest">
            New Reconciliation Run
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono text-lg leading-none px-1 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="run-date" className={labelClass}>Run Date</label>
            <TextInput id="run-date" type="date" value={runDate} onChange={setRunDate} required />
          </div>
          <div>
            <label htmlFor="ledger-file" className={labelClass}>Ledger File</label>
            <TextInput id="ledger-file" value={ledgerFile} onChange={setLedgerFile} placeholder="ledger_2026-08-25.csv" required />
          </div>
          <div>
            <label htmlFor="settlement-file" className={labelClass}>Settlement File</label>
            <TextInput
              id="settlement-file"
              value={settlementFile}
              onChange={setSettlementFile}
              placeholder="nibss_eft_20260825.txt"
              required
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
    </Dialog>
  );
}
