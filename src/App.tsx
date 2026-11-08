import { useState, useMemo } from "react";
import {
  TRANSACTIONS,
  RUNS,
  formatCurrency,
  formatDelta,
  type Transaction,
  type TxStatus,
  type ReconciliationRun,
} from "./data/transactions";
import ReportsPage from "./pages/ReportsPage";
import RulesPage from "./pages/RulesPage";
import SettingsPage from "./pages/SettingsPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import NewRunModal from "./components/NewRunModal";

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TxStatus, { label: string; dot: string; text: string }> = {
  matched: { label: "MATCHED", dot: "bg-[var(--status-match)]", text: "text-[var(--status-match)]" },
  mismatch: { label: "MISMATCH", dot: "bg-[var(--status-mismatch)]", text: "text-[var(--status-mismatch)]" },
  missing_settlement: { label: "MISSING STLMT", dot: "bg-[var(--status-warning)]", text: "text-[var(--status-warning)]" },
  missing_ledger: { label: "MISSING LEDGER", dot: "bg-[var(--status-warning)]", text: "text-[var(--status-warning)]" },
  partial: { label: "PARTIAL", dot: "bg-[var(--status-partial)]", text: "text-[var(--status-partial)]" },
};

function StatusBadge({ status }: { status: TxStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-widest ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Delta cell ──────────────────────────────────────────────────────────────

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[var(--muted-foreground)] font-mono text-xs">—</span>;
  if (delta === 0)
    return <span className="font-mono text-xs text-[var(--status-match)]">0.00</span>;
  const positive = delta > 0;
  return (
    <span
      className={`font-mono text-xs font-medium ${positive ? "text-[var(--status-partial)]" : "text-[var(--status-mismatch)]"}`}
    >
      {formatDelta(delta)}
    </span>
  );
}

// ─── Run history pill ────────────────────────────────────────────────────────

function RunCard({
  run,
  active,
  onClick,
}: {
  run: ReconciliationRun;
  active: boolean;
  onClick: () => void;
}) {
  const matchRate = ((run.matched / run.totalRecords) * 100).toFixed(1);
  const ts = new Date(run.timestamp);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] transition-colors ${
        active ? "bg-[#161b22]" : "hover:bg-[#0d1117]"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[11px] text-[var(--primary)]">{run.id}</span>
        <span
          className={`font-mono text-[10px] font-bold ${
            parseFloat(matchRate) >= 99
              ? "text-[var(--status-match)]"
              : parseFloat(matchRate) >= 95
              ? "text-[var(--status-partial)]"
              : "text-[var(--status-mismatch)]"
          }`}
        >
          {matchRate}%
        </span>
      </div>
      <div className="text-[11px] text-[var(--muted-foreground)] truncate">{run.ledgerFile}</div>
      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
        {ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
        {ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </button>
  );
}

// ─── Summary stat tiles ──────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] px-4 py-3">
      <div className={`font-mono text-2xl font-bold leading-none mb-1 ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest font-medium">{label}</div>
      {sub && <div className={`font-mono text-[10px] mt-1 ${color} opacity-70`}>{sub}</div>}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  tx,
  onClose,
}: {
  tx: Transaction;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-[440px] bg-[#0d1117] border-l border-[var(--border)] flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[#0d1117] z-10">
          <div>
            <div className="font-mono text-xs text-[var(--muted-foreground)] mb-0.5">TRANSACTION DETAIL</div>
            <div className="font-mono text-sm font-bold text-[var(--foreground)]">{tx.id}</div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="flex items-center gap-2">
            <StatusBadge status={tx.status} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Description</div>
            <div className="text-sm text-[var(--foreground)]">{tx.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" value={tx.date} mono />
            <Field label="Currency" value={tx.currency} mono />
            <Field label="Counterparty" value={tx.counterparty} />
            <Field label="Reference" value={tx.reference} mono />
          </div>

          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Amounts</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mb-0.5">Ledger</div>
                  <div className="font-mono text-sm text-[var(--foreground)]">
                    {formatCurrency(tx.ledgerAmount, tx.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mb-0.5">Settlement</div>
                  <div className="font-mono text-sm text-[var(--foreground)]">
                    {formatCurrency(tx.settlementAmount, tx.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mb-0.5">Delta</div>
                  <div className="font-mono text-sm">
                    <DeltaCell delta={tx.delta} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {tx.notes && (
            <div className="bg-[#161b22] border border-[var(--border)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--status-warning)] mb-1.5">Analyst Note</div>
              <div className="text-xs text-[var(--foreground)] leading-relaxed">{tx.notes}</div>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button className="w-full font-mono text-xs bg-[var(--secondary)] hover:bg-[#21262d] text-[var(--foreground)] border border-[var(--border)] py-2 px-4 transition-colors text-left">
              MARK AS REVIEWED
            </button>
            <button className="w-full font-mono text-xs bg-[var(--secondary)] hover:bg-[#21262d] text-[var(--foreground)] border border-[var(--border)] py-2 px-4 transition-colors text-left">
              ESCALATE TO CONTROLLER
            </button>
            <button className="w-full font-mono text-xs text-[var(--status-mismatch)] hover:bg-[#21262d] border border-[#f85149]/30 py-2 px-4 transition-colors text-left">
              FLAG FOR AUDIT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-0.5">{label}</div>
      <div className={`text-xs text-[var(--foreground)] ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

// ─── Audit report modal ───────────────────────────────────────────────────────

function AuditModal({
  run,
  transactions,
  onClose,
}: {
  run: ReconciliationRun;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const mismatches = transactions.filter((t) => t.status !== "matched");
  const matchPct = ((run.matched / run.totalRecords) * 100).toFixed(2);

  const lines = [
    `LEDGERSYNC AUDIT REPORT`,
    `Generated: ${new Date().toISOString()}`,
    `Run ID: ${run.id}`,
    `Ledger File: ${run.ledgerFile}`,
    `Settlement File: ${run.settlementFile}`,
    ``,
    `SUMMARY`,
    `─────────────────────────────────────────`,
    `Total Records     : ${run.totalRecords}`,
    `Matched           : ${run.matched} (${matchPct}%)`,
    `Mismatched        : ${run.mismatched}`,
    `Missing Settlement: ${run.missingSettlement}`,
    `Missing Ledger    : ${run.missingLedger}`,
    `Partial Match     : ${run.partial}`,
    ``,
    `EXCEPTIONS (${mismatches.length} records)`,
    `─────────────────────────────────────────`,
    ...mismatches.map(
      (t) =>
        `[${STATUS_CONFIG[t.status].label.padEnd(15)}] ${t.id}  ${t.reference.padEnd(35)} LEDGER: ${
          t.ledgerAmount != null ? t.ledgerAmount.toFixed(2).padStart(12) : "          N/A"
        }  STLMT: ${
          t.settlementAmount != null ? t.settlementAmount.toFixed(2).padStart(12) : "          N/A"
        }  DELTA: ${t.delta != null ? formatDelta(t.delta).padStart(10) : "         N/A"}${
          t.notes ? `\n  NOTE: ${t.notes}` : ""
        }`
    ),
    ``,
    `END OF REPORT`,
  ].join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[720px] max-h-[80vh] bg-[#0d1117] border border-[var(--border)] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-widest">
            Audit Report — {run.id}
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono transition-colors"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <pre className="font-mono text-[11px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
            {lines}
          </pre>
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={() => {
              const blob = new Blob([lines], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${run.id}-audit-report.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="font-mono text-xs bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-1.5 hover:opacity-90 transition-opacity"
          >
            DOWNLOAD .TXT
          </button>
          <button
            onClick={onClose}
            className="font-mono text-xs text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-1.5 hover:bg-[var(--secondary)] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type NavTab = "RECONCILIATION" | "REPORTS" | "RULES" | "SETTINGS";

const ALL_FILTERS: { key: TxStatus | "all"; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "matched", label: "MATCHED" },
  { key: "mismatch", label: "MISMATCH" },
  { key: "missing_settlement", label: "MISSING STLMT" },
  { key: "missing_ledger", label: "MISSING LEDGER" },
  { key: "partial", label: "PARTIAL" },
];

export default function App() {
  const [navTab, setNavTab] = useState<NavTab>("RECONCILIATION");
  const [activeRun, setActiveRun] = useState<ReconciliationRun>(RUNS[0]);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [filter, setFilter] = useState<TxStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [sortField, setSortField] = useState<keyof Transaction>("id");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let rows = TRANSACTIONS;
    if (filter !== "all") rows = rows.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = (av as string | number) < (bv as string | number) ? -1 : (av as string | number) > (bv as string | number) ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [filter, search, sortField, sortAsc]);

  function toggleSort(field: keyof Transaction) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const matchRate = ((activeRun.matched / activeRun.totalRecords) * 100).toFixed(1);
  const issueCount =
    activeRun.mismatched + activeRun.missingSettlement + activeRun.missingLedger + activeRun.partial;

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]">
      {/* ── Topbar ── */}
      <header className="flex items-center gap-6 px-5 py-0 h-11 border-b border-[var(--border)] bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect x="2" y="2" width="7" height="7" fill="var(--primary)" />
              <rect x="11" y="2" width="7" height="7" fill="var(--border)" />
              <rect x="2" y="11" width="7" height="7" fill="var(--border)" />
              <rect x="11" y="11" width="7" height="7" fill="var(--primary)" opacity="0.5" />
            </svg>
          </div>
          <span className="font-mono text-sm font-bold text-[var(--foreground)] tracking-tight">
            LEDGER<span className="text-[var(--primary)]">SYNC</span>
          </span>
        </div>

        <nav className="flex items-center gap-0 h-full">
          {(["RECONCILIATION", "REPORTS", "RULES", "SETTINGS"] as NavTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setNavTab(item)}
              className={`h-full px-4 font-mono text-[11px] tracking-widest border-b-2 transition-colors ${
                navTab === item
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-match)] animate-pulse" />
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]">LIVE SYNC</span>
          </div>
          <div className="font-mono text-[10px] text-[var(--muted-foreground)] border border-[var(--border)] px-2 py-0.5">
            MERIDIAN-NG · PROD
          </div>
        </div>
      </header>

      {navTab === "REPORTS" && <ReportsPage />}
      {navTab === "RULES" && <RulesPage />}
      {navTab === "SETTINGS" && <SettingsPage />}

      {navTab === "RECONCILIATION" && <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-56 border-r border-[var(--border)] flex flex-col bg-[#0a0e14] shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              Run History
            </div>
            {RUNS.map((r) => (
              <RunCard
                key={r.id}
                run={r}
                active={r.id === activeRun.id}
                onClick={() => setActiveRun(r)}
              />
            ))}
          </div>

          <div className="px-3 py-3 mt-auto border-t border-[var(--border)]">
            <button
              onClick={() => setShowNewRunModal(true)}
              className="w-full font-mono text-[10px] text-[var(--primary)] border border-[var(--primary)]/30 py-1.5 px-3 hover:bg-[var(--primary)]/10 transition-colors"
            >
              + NEW RUN
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* ── Run header ── */}
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[#0d1117] shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono text-[10px] text-[var(--muted-foreground)] mb-0.5 uppercase tracking-widest">
                  Active Reconciliation Run
                </div>
                <div className="font-mono text-sm font-bold text-[var(--foreground)]">{activeRun.id}</div>
                <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  {activeRun.ledgerFile} ↔ {activeRun.settlementFile}
                </div>
              </div>
              <button
                onClick={() => setShowAudit(true)}
                className="font-mono text-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity uppercase tracking-widest"
              >
                Export Audit Report
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <StatTile
                label="Match Rate"
                value={`${matchRate}%`}
                sub={`${activeRun.matched} / ${activeRun.totalRecords}`}
                color={
                  parseFloat(matchRate) >= 99
                    ? "text-[var(--status-match)]"
                    : parseFloat(matchRate) >= 95
                    ? "text-[var(--status-partial)]"
                    : "text-[var(--status-mismatch)]"
                }
              />
              <StatTile
                label="Matched"
                value={activeRun.matched}
                color="text-[var(--status-match)]"
              />
              <StatTile
                label="Mismatched"
                value={activeRun.mismatched}
                color="text-[var(--status-mismatch)]"
              />
              <StatTile
                label="Missing"
                value={activeRun.missingSettlement + activeRun.missingLedger}
                sub={`${activeRun.missingSettlement} stlmt / ${activeRun.missingLedger} ledger`}
                color="text-[var(--status-warning)]"
              />
              <StatTile
                label="Issues Total"
                value={issueCount}
                color={issueCount > 0 ? "text-[var(--status-mismatch)]" : "text-[var(--status-match)]"}
              />
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="flex items-center gap-0 px-5 border-b border-[var(--border)] bg-[#0a0e14] shrink-0 h-9">
            {ALL_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-full px-3 font-mono text-[10px] tracking-widest transition-colors border-r border-[var(--border)] ${
                  filter === f.key
                    ? "bg-[var(--secondary)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="ml-auto flex items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, description, reference…"
                className="font-mono text-[11px] bg-transparent border-l border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] px-3 h-9 w-64 outline-none focus:bg-[var(--secondary)]"
              />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left ledger-table">
              <thead className="sticky top-0 bg-[#0d1117] z-10">
                <tr className="border-b border-[var(--border)]">
                  {(
                    [
                      { label: "ID", field: "id" as const, w: "w-24" },
                      { label: "DATE", field: "date" as const, w: "w-24" },
                      { label: "DESCRIPTION", field: "description" as const, w: "" },
                      { label: "COUNTERPARTY", field: "counterparty" as const, w: "w-40" },
                      { label: "LEDGER AMT", field: "ledgerAmount" as const, w: "w-32" },
                      { label: "STLMT AMT", field: "settlementAmount" as const, w: "w-32" },
                      { label: "CCY", field: "currency" as const, w: "w-12" },
                      { label: "DELTA", field: "delta" as const, w: "w-24" },
                      { label: "STATUS", field: "status" as const, w: "w-40" },
                    ] as const
                  ).map(({ label, field, w }) => (
                    <th
                      key={field}
                      className={`px-3 py-2 font-mono text-[10px] text-[var(--muted-foreground)] tracking-widest cursor-pointer select-none hover:text-[var(--foreground)] transition-colors ${w}`}
                      onClick={() => toggleSort(field)}
                    >
                      {label}
                      {sortField === field && (
                        <span className="ml-1 opacity-60">{sortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-[var(--border)] cursor-pointer transition-colors"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--primary)]">{tx.id}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">{tx.date}</td>
                    <td className="px-3 py-2 text-xs text-[var(--foreground)] max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[var(--foreground)] truncate">{tx.counterparty}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-right text-[var(--foreground)]">
                      {formatCurrency(tx.ledgerAmount, tx.currency)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-right text-[var(--foreground)]">
                      {formatCurrency(tx.settlementAmount, tx.currency)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">{tx.currency}</td>
                    <td className="px-3 py-2 text-right">
                      <DeltaCell delta={tx.delta} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center font-mono text-xs text-[var(--muted-foreground)]">
                      NO RECORDS MATCH CURRENT FILTERS
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-2 border-t border-[var(--border)] bg-[#0d1117] shrink-0 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
              {filtered.length} of {TRANSACTIONS.length} records
            </span>
            <div className="flex items-center gap-4">
              {[
                { color: "var(--status-match)", label: "Matched" },
                { color: "var(--status-mismatch)", label: "Mismatch" },
                { color: "var(--status-warning)", label: "Missing" },
                { color: "var(--status-partial)", label: "Partial" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `var(${color.slice(4, -1)})` }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>}

      {selectedTx && <DetailDrawer tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      {showAudit && (
        <AuditModal
          run={activeRun}
          transactions={TRANSACTIONS}
          onClose={() => setShowAudit(false)}
        />
      )}
      {showNewRunModal && (
        <NewRunModal
          onClose={() => setShowNewRunModal(false)}
          onSubmit={() => setShowNewRunModal(false)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
