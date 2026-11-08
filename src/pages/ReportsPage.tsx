import { useState } from "react";
import { type HistoryRow, type ScheduledReport } from "../data/reports";
import { transactionsForRun, type ReconciliationRun, type Transaction } from "../data/transactions";
import FormRow from "../components/FormRow";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import Toggle from "../components/Toggle";
import Flash from "../components/Flash";
import { formatDateTime } from "../lib/datetime";
import type { ReportsTab } from "../lib/route";
import { useWorkspace } from "../lib/workspace";

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

function downloadText(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildReport(config: ReportConfig, run: ReconciliationRun, txs: Transaction[]) {
  const rows = config.includeMatchedTx ? txs : txs.filter((t) => t.status !== "matched");
  const lines = [
    `LEDGERSYNC REPORT — ${config.name}`,
    `Type: ${config.type}`,
    `Run: ${run.id}`,
    `Range: ${config.dateFrom} to ${config.dateTo}`,
    `Format: ${config.format.toUpperCase()}`,
    "",
    config.includeSummary
      ? `SUMMARY  matched=${run.matched} mismatch=${run.mismatched} missingStlmt=${run.missingSettlement} missingLedger=${run.missingLedger} partial=${run.partial}`
      : "",
    "",
    config.includeExceptions ? "EXCEPTIONS" : "",
    ...rows.map(
      (t) =>
        `${t.id}\t${t.status}\t${t.reference}\t${t.ledgerAmount ?? "N/A"}\t${t.settlementAmount ?? "N/A"}\t${t.delta ?? "N/A"}`,
    ),
  ].filter((line) => line !== "");
  return lines.join("\n");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ReportsPage({
  tab,
  onTabChange,
  runs,
  transactions,
}: {
  tab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
  runs: ReconciliationRun[];
  transactions: Transaction[];
}) {
  const { workspace, setScheduled, setReportHistory } = useWorkspace();
  const scheduled = workspace.scheduled ?? [];
  const history = workspace.reportHistory ?? [];
  const [submitted, setSubmitted] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState({ name: "", frequency: "Daily @ 17:00 WAT", recipients: "", format: "PDF" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function flashMsg(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2800);
  }
  const [config, setConfig] = useState<ReportConfig>({
    name: "",
    type: "reconciliation_summary",
    dateFrom: "2026-08-24",
    dateTo: "2026-08-24",
    runIds: [runs[0]?.id ?? ""],
    format: "pdf",
    includeSummary: true,
    includeExceptions: true,
    includeMatchedTx: false,
    groupBy: "status",
    notifyEmail: "",
  });

  function set<K extends keyof ReportConfig>(k: K, v: ReportConfig[K]) {
    setConfig(c => ({ ...c, [k]: v }));
    setErrors(e => {
      if (!e[k as string]) return e;
      const next = { ...e };
      delete next[k as string];
      return next;
    });
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!config.name.trim()) next.name = "Report name is required.";
    if (config.dateFrom && config.dateTo && config.dateFrom > config.dateTo) {
      next.dateTo = "End date must be on or after the start date.";
    }
    if (config.notifyEmail.trim() && !EMAIL_RE.test(config.notifyEmail.trim())) {
      next.notifyEmail = "Enter a valid email address, or leave this blank.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const run = runs.find((r) => r.id === config.runIds[0]) ?? runs[0];
    if (!run) {
      flashMsg("No reconciliation run to report on.");
      return;
    }
    const txs = transactionsForRun(run.id, transactions);
    const body = buildReport(config, run, txs);
    const ext = config.format === "xlsx" ? "csv" : config.format === "csv" ? "csv" : "txt";
    const filename = `${config.name.replace(/\s+/g, "_")}_${run.id}.${ext}`;
    downloadText(filename, body);
    const now = new Date().toISOString();
    setReportHistory((h) => [
      {
        id: `RPT-${now.slice(0, 10).replace(/-/g, "")}-${String(h.length + 1).padStart(3, "0")}`,
        name: config.name,
        generated: now,
        format: config.format.toUpperCase(),
        size: `${Math.max(1, Math.round(body.length / 1024))} KB`,
        run: run.id,
        status: "ready",
        body,
      },
      ...h,
    ]);
    setSubmitted(true);
    flashMsg(`Downloaded ${filename}`);
    setTimeout(() => setSubmitted(false), 3000);
  }

  function saveTemplate() {
    if (!config.name.trim()) {
      setErrors({ name: "Name the report before saving a template." });
      return;
    }
    flashMsg(`Template saved locally: ${config.name}`);
  }

  function openNewSchedule() {
    setEditingSchedule(null);
    setScheduleDraft({ name: "", frequency: "Daily @ 17:00 WAT", recipients: "", format: "PDF" });
    setShowScheduleForm(true);
  }

  function openEditSchedule(s: ScheduledReport) {
    setEditingSchedule(s);
    setScheduleDraft({ name: s.name, frequency: s.frequency, recipients: s.recipients, format: s.format });
    setShowScheduleForm(true);
  }

  function saveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleDraft.name.trim()) {
      flashMsg("Schedule name is required.");
      return;
    }
    if (editingSchedule) {
      setScheduled((list) =>
        list.map((s) => (s.id === editingSchedule.id ? { ...s, ...scheduleDraft } : s)),
      );
      flashMsg(`Updated ${scheduleDraft.name}`);
    } else {
      const id = `SCH-${String(scheduled.length + 1).padStart(3, "0")}`;
      setScheduled((list) => [
        {
          id,
          name: scheduleDraft.name,
          type: "Reconciliation Summary",
          frequency: scheduleDraft.frequency,
          lastRun: "—",
          nextRun: new Date().toISOString(),
          format: scheduleDraft.format,
          recipients: scheduleDraft.recipients || "controller@company.ng",
          status: "active",
        },
        ...list,
      ]);
      flashMsg(`Scheduled ${scheduleDraft.name}`);
    }
    setShowScheduleForm(false);
    setEditingSchedule(null);
  }

  function toggleSchedule(id: string) {
    setScheduled((list) =>
      list.map((s) => {
        if (s.id !== id) return s;
        const next = s.status === "active" ? "paused" : "active";
        flashMsg(`${s.name} ${next === "paused" ? "paused" : "resumed"}`);
        return { ...s, status: next as ScheduledReport["status"] };
      }),
    );
  }

  function downloadHistory(row: HistoryRow) {
    downloadText(`${row.id}.${row.format.toLowerCase() === "xlsx" ? "csv" : "txt"}`, row.body);
    flashMsg(`Downloaded ${row.id}`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full min-h-0">
      <Flash message={flash} />
      {/* sub-nav */}
      <div className="flex items-center gap-0 px-3 sm:px-5 border-b border-[var(--border)] bg-[var(--card)] h-9 shrink-0 overflow-x-auto">
        {(["generate", "scheduled", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            aria-pressed={tab === t}
            className={`h-full px-4 font-mono text-[11px] tracking-widest whitespace-nowrap border-r border-[var(--border)] transition-colors ${
              tab === t ? "bg-[var(--secondary)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "generate" ? "GENERATE REPORT" : t === "scheduled" ? "SCHEDULED" : "REPORT HISTORY"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">

        {/* ── Generate ── */}
        {tab === "generate" && (
          <div className="max-w-2xl">
            <div className="mb-5">
              <h2 className="font-mono text-sm font-bold text-[var(--foreground)]">Generate Report</h2>
              <p className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">
                Configure and produce a one-off reconciliation report for download or delivery.
              </p>
            </div>

            <form noValidate onSubmit={handleGenerate} className="bg-[var(--card)] border border-[var(--border)]">
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--secondary)]">
                <span className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Report Configuration</span>
              </div>
              <div className="px-4 sm:px-5">
                <FormRow label="Report Name" required>
                  <TextInput value={config.name} onChange={v => set("name", v)} placeholder="e.g. August 24 EOD Reconciliation" required ariaInvalid={!!errors.name} />
                  {errors.name && <p className="font-mono text-[11px] text-[var(--status-mismatch)] mt-1">{errors.name}</p>}
                </FormRow>
                <FormRow label="Report Type" required>
                  <SelectInput value={config.type} onChange={v => set("type", v)}>
                    <option value="reconciliation_summary">Reconciliation Summary</option>
                    <option value="exception_detail">Exception Detail</option>
                    <option value="full_audit">Full Audit Package</option>
                    <option value="mismatch_analysis">Mismatch Analysis</option>
                    <option value="missing_entries">Missing Entries</option>
                  </SelectInput>
                </FormRow>
                <FormRow label="Date Range" required htmlFor="report-date-from">
                  <div className="flex items-center gap-2">
                    <TextInput id="report-date-from" type="date" value={config.dateFrom} onChange={v => set("dateFrom", v)} />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">to</span>
                    <TextInput id="report-date-to" ariaLabel="End date" type="date" value={config.dateTo} onChange={v => set("dateTo", v)} ariaInvalid={!!errors.dateTo} />
                  </div>
                  {errors.dateTo && <p className="font-mono text-[11px] text-[var(--status-mismatch)] mt-1">{errors.dateTo}</p>}
                </FormRow>
                <FormRow label="Source Run">
                  <SelectInput value={config.runIds[0]} onChange={v => set("runIds", [v])}>
                    {runs.map(r => (
                      <option key={r.id} value={r.id}>{r.id} — {r.ledgerFile}</option>
                    ))}
                  </SelectInput>
                </FormRow>
              </div>

              <div className="px-5 py-3 border-t border-b border-[var(--border)] bg-[var(--secondary)] mt-2">
                <span className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Content & Format</span>
              </div>
              <div className="px-5">
                <FormRow label="Output Format" required>
                  <div role="radiogroup" aria-label="Output format" className="flex flex-wrap gap-4 sm:pt-2">
                    {["pdf", "xlsx", "csv", "txt"].map(f => (
                      <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="report-format"
                          value={f}
                          checked={config.format === f}
                          onChange={() => set("format", f)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`w-3.5 h-3.5 border transition-colors flex items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)] ${config.format === f ? "border-[var(--primary)] bg-[var(--primary)]/20" : "border-[var(--border)]"}`}
                        >
                          {config.format === f && <span className="w-1.5 h-1.5 bg-[var(--primary)]" />}
                        </span>
                        <span className="font-mono text-[11px] uppercase text-[var(--foreground)]">{f}</span>
                      </label>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="Group By">
                  <SelectInput value={config.groupBy} onChange={v => set("groupBy", v)}>
                    <option value="status">Status</option>
                    <option value="counterparty">Counterparty</option>
                    <option value="currency">Currency</option>
                    <option value="date">Date</option>
                  </SelectInput>
                </FormRow>
                <FormRow label="Include Sections">
                  <div className="space-y-2.5 py-1">
                    <Toggle checked={config.includeSummary} onChange={v => set("includeSummary", v)} label="Executive Summary" />
                    <Toggle checked={config.includeExceptions} onChange={v => set("includeExceptions", v)} label="Exception Detail (mismatches, missing)" />
                    <Toggle checked={config.includeMatchedTx} onChange={v => set("includeMatchedTx", v)} label="Matched Transactions (may increase file size)" />
                  </div>
                </FormRow>
                <FormRow label="Notify Email">
                  <TextInput value={config.notifyEmail} onChange={v => set("notifyEmail", v)} placeholder="controller@company.com" type="email" ariaInvalid={!!errors.notifyEmail} />
                  {errors.notifyEmail
                    ? <p className="font-mono text-[11px] text-[var(--status-mismatch)] mt-1">{errors.notifyEmail}</p>
                    : <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-1">Report link sent on completion. Leave blank to skip.</div>}
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
                <button type="button" onClick={saveTemplate} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-2 hover:bg-[var(--secondary)] transition-colors">
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
              <button type="button" onClick={openNewSchedule} className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity">
                + NEW SCHEDULE
              </button>
            </div>

            {showScheduleForm && (
              <form onSubmit={saveSchedule} className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <FormRow label="Name" required>
                  <TextInput value={scheduleDraft.name} onChange={(v) => setScheduleDraft((d) => ({ ...d, name: v }))} placeholder="e.g. Daily EOD Summary" />
                </FormRow>
                <FormRow label="Frequency">
                  <SelectInput value={scheduleDraft.frequency} onChange={(v) => setScheduleDraft((d) => ({ ...d, frequency: v }))}>
                    <option value="Daily @ 17:00 WAT">Daily @ 17:00 WAT</option>
                    <option value="Weekly Mon @ 08:00 WAT">Weekly Mon @ 08:00 WAT</option>
                    <option value="Monthly last biz day">Monthly last biz day</option>
                  </SelectInput>
                </FormRow>
                <FormRow label="Format">
                  <SelectInput value={scheduleDraft.format} onChange={(v) => setScheduleDraft((d) => ({ ...d, format: v }))}>
                    <option value="PDF">PDF</option>
                    <option value="XLSX">XLSX</option>
                    <option value="CSV">CSV</option>
                  </SelectInput>
                </FormRow>
                <FormRow label="Recipients">
                  <TextInput value={scheduleDraft.recipients} onChange={(v) => setScheduleDraft((d) => ({ ...d, recipients: v }))} placeholder="controller@company.ng" />
                </FormRow>
                <div className="py-3 flex gap-2">
                  <button type="submit" className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90">
                    {editingSchedule ? "SAVE SCHEDULE" : "CREATE SCHEDULE"}
                  </button>
                  <button type="button" onClick={() => { setShowScheduleForm(false); setEditingSchedule(null); }} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--secondary)]">
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {scheduled.map(s => (
                <div key={s.id} className="bg-[var(--card)] border border-[var(--border)]">
                  <div className="flex items-start gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[var(--foreground)]">{s.name}</span>
                        <span className={`font-mono text-[11px] px-1.5 py-0.5 ${s.status === "active" ? "bg-[var(--status-match)]/10 text-[var(--status-match)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                        {[
                          ["Type", s.type],
                          ["Format", s.format],
                          ["Frequency", s.frequency],
                          ["Recipients", s.recipients],
                          ["Last Run", s.lastRun === "—" ? "—" : formatDateTime(s.lastRun)],
                          ["Next Run", formatDateTime(s.nextRun)],
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="font-mono text-[11px] text-[var(--muted-foreground)] w-20 shrink-0">{k}</span>
                            <span className="font-mono text-[11px] text-[var(--foreground)] truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button type="button" onClick={() => openEditSchedule(s)} className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-1 hover:bg-[var(--primary)]/10 transition-colors">EDIT</button>
                      <button type="button" onClick={() => toggleSchedule(s.id)} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1 hover:bg-[var(--secondary)] transition-colors">
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Report ID", "Name", "Generated", "Run", "Format", "Size", ""].map(h => (
                    <th key={h} className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)] tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--primary)]">{r.id}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--foreground)] max-w-[200px] truncate">{r.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                      {formatDateTime(r.generated)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">{r.run}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--foreground)]">{r.format}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted-foreground)]">{r.size}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => downloadHistory(r)} className="font-mono text-[11px] text-[var(--primary)] hover:underline">DOWNLOAD</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
