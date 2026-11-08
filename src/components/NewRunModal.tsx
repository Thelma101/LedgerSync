import { useState } from "react";
import Dialog from "./Dialog";
import TextInput from "./TextInput";
import { todayInZone } from "../lib/datetime";

export interface NewRunConfig {
  ledgerFile: File;
  settlementFile: File;
  runDate: string;
}

function FilePick({
  id,
  label,
  hint,
  file,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">
        {label}
      </label>
      <p className="font-mono text-[11px] text-[var(--muted-foreground)] mb-2">{hint}</p>
      <input
        id={id}
        type="file"
        accept=".csv,.txt,.tsv"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full font-mono text-xs text-[var(--foreground)] file:mr-3 file:font-mono file:text-[11px] file:bg-[var(--secondary)] file:border file:border-[var(--border)] file:text-[var(--foreground)] file:px-3 file:py-1.5 file:cursor-pointer"
      />
      {file && (
        <div className="mt-1.5 font-mono text-[11px] text-[var(--primary)]">
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </div>
      )}
    </div>
  );
}

export default function NewRunModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (config: NewRunConfig) => Promise<void> | void;
}) {
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [settlementFile, setSettlementFile] = useState<File | null>(null);
  const [runDate, setRunDate] = useState(todayInZone());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = Boolean(ledgerFile && settlementFile && runDate) && !busy;

  async function loadSamples() {
    setError(null);
    try {
      const [ledgerRes, settlementRes] = await Promise.all([
        fetch("/samples/ledger_sample.csv"),
        fetch("/samples/settlement_sample.csv"),
      ]);
      if (!ledgerRes.ok || !settlementRes.ok) throw new Error("Sample files were not found.");
      const [ledgerBlob, settlementBlob] = await Promise.all([ledgerRes.blob(), settlementRes.blob()]);
      setLedgerFile(new File([ledgerBlob], "ledger_sample.csv", { type: "text/csv" }));
      setSettlementFile(new File([settlementBlob], "settlement_sample.csv", { type: "text/csv" }));
    } catch {
      setError("Could not load sample files. Download them from the links and upload manually.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ledgerFile || !settlementFile || !runDate) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ledgerFile, settlementFile, runDate });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the run.");
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="new-run-title" className="max-w-[520px]">
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
          <p className="font-mono text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Upload today&apos;s ledger export from your ERP and the matching NIBSS / settlement file. LedgerSync compares them in the browser for this demo.
          </p>
          <div>
            <label htmlFor="run-date" className="block font-mono text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">
              Run Date
            </label>
            <TextInput id="run-date" type="date" value={runDate} onChange={setRunDate} required />
          </div>
          <FilePick
            id="ledger-file"
            label="Ledger file"
            hint="CSV from your core ledger / ERP daily export."
            file={ledgerFile}
            onChange={setLedgerFile}
          />
          <FilePick
            id="settlement-file"
            label="Settlement file"
            hint="CSV or TXT from NIBSS, RTGS, or the acquirer."
            file={settlementFile}
            onChange={setSettlementFile}
          />
          <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
            Need a trial pair?{" "}
            <button
              type="button"
              onClick={loadSamples}
              className="text-[var(--primary)] hover:underline"
            >
              Use bundled samples
            </button>
            {" · "}
            <a href="/samples/ledger_sample.csv" download className="text-[var(--primary)] hover:underline">
              ledger_sample.csv
            </a>
            {" · "}
            <a href="/samples/settlement_sample.csv" download className="text-[var(--primary)] hover:underline">
              settlement_sample.csv
            </a>
          </p>
          {error && <p className="font-mono text-[11px] text-[var(--status-mismatch)]">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="font-mono text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "MATCHING…" : "START RUN"}
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
