import { useState } from "react";
import { RUNS } from "../data/transactions";

interface ReportConfig {
  name: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  runIds: string[];
  format: string;
  includeSummary: boolean;
  includeExceptions: boolean;
  includeMatchedTx: boolean;
  groupBy: string;
  notifyEmail: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: string;
  lastRun: string;
  nextRun: string;
  format: string;
  recipients: string;
  status: "active" | "paused";
}

const SCHEDULED: ScheduledReport[] = [
  {
    id: "SCH-001",
    name: "Daily EOD NIBSS Reconciliation Summary",
    type: "Reconciliation Summary",
    frequency: "Daily @ 17:00 WAT",
    lastRun: "2026-08-23T16:00:12Z",
    nextRun: "2026-08-24T16:00:00Z",
    format: "PDF",
    recipients: "controller@company.ng, cfo@company.ng",
    status: "active",
  },
  {
    id: "SCH-002",
    name: "Weekly Exception & Break Report",
    type: "Exception Detail",
    frequency: "Weekly Mon @ 08:00 WAT",
    lastRun: "2026-08-18T07:00:05Z",
    nextRun: "2026-08-25T07:00:00Z",
    format: "XLSX",
    recipients: "audit@company.ng",
    status: "active",
  },
  {
    id: "SCH-003",
    name: "Month-End CBN Audit Package",
    type: "Full Audit",
    frequency: "Monthly last biz day",
    lastRun: "2026-07-31T20:00:00Z",
    nextRun: "2026-08-29T20:00:00Z",
    format: "ZIP (PDF + CSV)",
    recipients: "external-auditor@kpmg.ng",
    status: "paused",
  },
];

const REPORT_HISTORY = [
  { id: "RPT-20260824-001", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-24T09:14:50Z", format: "PDF", size: "142 KB", run: "RUN-2026-08-24-001", status: "ready" },
  { id: "RPT-20260823-003", name: "Weekly Exception & Break Report", generated: "2026-08-23T18:01:22Z", format: "XLSX", size: "88 KB", run: "RUN-2026-08-23-003", status: "ready" },
  { id: "RPT-20260823-002", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-23T16:00:45Z", format: "PDF", size: "131 KB", run: "RUN-2026-08-23-003", status: "ready" },
  { id: "RPT-20260822-001", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-22T16:00:33Z", format: "PDF", size: "119 KB", run: "RUN-2026-08-22-002", status: "ready" },
];

function FormRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4 py-3 border-b border-[var(--border)]">
      <label className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest pt-2">
        {label}{required && <span className="text-[var(--status-mismatch)] ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 outline-none focus:border-[var(--primary)] placeholder-[var(--muted-foreground)] transition-colors"
    />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 outline-none focus:border-[var(--primary)] transition-colors appearance-none cursor-pointer"
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 relative transition-colors border ${checked ? "bg-[var(--primary)]/20 border-[var(--primary)]" : "bg-[var(--secondary)] border-[var(--border)]"}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 transition-all ${checked ? "left-4 bg-[var(--primary)]" : "left-0.5 bg-[var(--muted-foreground)]"}`} />
      </div>
      <span className="font-mono text-[11px] text-[var(--foreground)]">{label}</span>
    </label>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<"generate" | "scheduled" | "history">("generate");
  const [submitted, setSubmitted] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    name: "",
    type: "reconciliation_summary",
    dateFrom: "2026-08-24",
    dateTo: "2026-08-24",
    runIds: [RUNS[0].id],
    format: "pdf",
    includeSummary: true,
    includeExceptions: true,
    includeMatchedTx: false,
    groupBy: "status",
    notifyEmail: "",
  });

  function set<K extends keyof ReportConfig>(k: K, v: ReportConfig[K]) {
    setConfig(c => ({ ...c, [k]: v }));
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* sub-nav */}
      <div className="flex items-center gap-0 px-5 border-b border-[var(--border)] bg-[#0d1117] h-9 shrink-0">
        {(["generate", "scheduled", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-full px-4 font-mono text-[10px] tracking-widest border-r border-[var(--border)] transition-colors ${
              tab === t ? "bg-[var(--secondary)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "generate" ? "GENERATE REPORT" : t === "scheduled" ? "SCHEDULED" : "REPORT HISTORY"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">

        {/* ── Generate ── */}
        {tab === "generate" && (
          <div className="max-w-2xl">
            <div className="mb-5">
              <h2 className="font-mono text-sm font-bold text-[var(--foreground)]">Generate Report</h2>
              <p className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                Configure and produce a one-off reconciliation report for download or delivery.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="bg-[var(--card)] border border-[var(--border)]">
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--secondary)]">
                <span className="font-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">Report Configuration</span>
              </div>
              <div className="px-5">
                <FormRow label="Report Name" required>
                  <Input value={config.name} onChange={v => set("name", v)} placeholder="e.g. August 24 EOD Reconciliation" />
                </FormRow>
                <FormRow label="Report Type" required>
                  <Select value={config.type} onChange={v => set("type", v)}>
                    <option value="reconciliation_summary">Reconciliation Summary</option>
                    <option value="exception_detail">Exception Detail</option>
                    <option value="full_audit">Full Audit Package</option>
                    <option value="mismatch_analysis">Mismatch Analysis</option>
                    <option value="missing_entries">Missing Entries</option>
                  </Select>
                </FormRow>
                <FormRow label="Date Range" required>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={config.dateFrom} onChange={v => set("dateFrom", v)} />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">to</span>
                    <Input type="date" value={config.dateTo} onChange={v => set("dateTo", v)} />
                  </div>
                </FormRow>
                <FormRow label="Source Run">
                  <Select value={config.runIds[0]} onChange={v => set("runIds", [v])}>
                    {RUNS.map(r => (
                      <option key={r.id} value={r.id}>{r.id} — {r.ledgerFile}</option>
                    ))}
                  </Select>
                </FormRow>
              </div>

              <div className="px-5 py-3 border-t border-b border-[var(--border)] bg-[var(--secondary)] mt-2">
                <span className="font-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">Content & Format</span>
              </div>
              <div className="px-5">
                <FormRow label="Output Format" required>
                  <div className="flex gap-3">
                    {["pdf", "xlsx", "csv", "txt"].map(f => (
                      <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                        <div
                          onClick={() => set("format", f)}
                          className={`w-3.5 h-3.5 border transition-colors flex items-center justify-center ${config.format === f ? "border-[var(--primary)] bg-[var(--primary)]/20" : "border-[var(--border)]"}`}
                        >
                          {config.format === f && <div className="w-1.5 h-1.5 bg-[var(--primary)]" />}
                        </div>
                        <span className="font-mono text-[11px] uppercase text-[var(--foreground)]">{f}</span>
                      </label>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="Group By">
                  <Select value={config.groupBy} onChange={v => set("groupBy", v)}>
                    <option value="status">Status</option>
                    <option value="counterparty">Counterparty</option>
                    <option value="currency">Currency</option>
                    <option value="date">Date</option>
                  </Select>
                </FormRow>
                <FormRow label="Include Sections">
                  <div className="space-y-2.5 py-1">
                    <Toggle checked={config.includeSummary} onChange={v => set("includeSummary", v)} label="Executive Summary" />
                    <Toggle checked={config.includeExceptions} onChange={v => set("includeExceptions", v)} label="Exception Detail (mismatches, missing)" />
                    <Toggle checked={config.includeMatchedTx} onChange={v => set("includeMatchedTx", v)} label="Matched Transactions (may increase file size)" />
                  </div>
                </FormRow>
                <FormRow label="Notify Email">
                  <Input value={config.notifyEmail} onChange={v => set("notifyEmail", v)} placeholder="controller@company.com" type="email" />
                  <div className="font-mono text-[10px] text-[var(--muted-foreground)] mt-1">Report link sent on completion. Leave blank to skip.</div>
                </FormRow>
              </div>

              <div className="px-5 py-4 border-t border-[var(--border)] flex items-center gap-3 mt-2">
                <button
                  type="submit"
                  className={`font-mono text-[11px] px-5 py-2 uppercase tracking-widest transition-all ${
                    submitted
                      ? "bg-[var(--status-match)]/20 text-[var(--status-match)] border border-[var(--status-match)]/40"
                      : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  }`}
                >
                  {submitted ? "✓ QUEUED FOR GENERATION" : "GENERATE REPORT"}
                </button>
                <button type="button" className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-2 hover:bg-[var(--secondary)] transition-colors">
                  SAVE AS TEMPLATE
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Scheduled ── */}
        {tab === "scheduled" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-mono text-sm font-bold text-[var(--foreground)]">Scheduled Reports</h2>
                <p className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                  Automated report delivery configured for your organization.
                </p>
              </div>
              <button className="font-mono text-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity">
                + NEW SCHEDULE
              </button>
            </div>

            <div className="space-y-2">
              {SCHEDULED.map(s => (
                <div key={s.id} className="bg-[var(--card)] border border-[var(--border)]">
                  <div className="flex items-start gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[var(--foreground)]">{s.name}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${s.status === "active" ? "bg-[var(--status-match)]/10 text-[var(--status-match)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                        {[
                          ["Type", s.type],
                          ["Format", s.format],
                          ["Frequency", s.frequency],
                          ["Recipients", s.recipients],
                          ["Last Run", new Date(s.lastRun).toLocaleString()],
                          ["Next Run", new Date(s.nextRun).toLocaleString()],
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="font-mono text-[10px] text-[var(--muted-foreground)] w-20 shrink-0">{k}</span>
                            <span className="font-mono text-[10px] text-[var(--foreground)] truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button className="font-mono text-[10px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-1 hover:bg-[var(--primary)]/10 transition-colors">EDIT</button>
                      <button className="font-mono text-[10px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1 hover:bg-[var(--secondary)] transition-colors">
                        {s.status === "active" ? "PAUSE" : "RESUME"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div className="max-w-3xl">
            <div className="mb-5">
              <h2 className="font-mono text-sm font-bold text-[var(--foreground)]">Report History</h2>
              <p className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">All generated reports, retained for 90 days.</p>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Report ID", "Name", "Generated", "Run", "Format", "Size", ""].map(h => (
                    <th key={h} className="px-3 py-2 font-mono text-[10px] text-[var(--muted-foreground)] tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORT_HISTORY.map(r => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--primary)]">{r.id}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--foreground)] max-w-[200px] truncate">{r.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                      {new Date(r.generated).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">{r.run}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--foreground)]">{r.format}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">{r.size}</td>
                    <td className="px-3 py-2.5">
                      <button className="font-mono text-[10px] text-[var(--primary)] hover:underline">DOWNLOAD</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
