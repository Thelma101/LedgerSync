import { useEffect, useMemo, useState } from "react";
import {
  RUNS as SEED_RUNS,
  formatCurrency,
  formatDelta,
  summarizeTransactions,
  transactionsForRun,
  type Transaction,
  type TxStatus,
  type ReconciliationRun,
} from "./data/transactions";
import ReportsPage from "./pages/ReportsPage";
import RulesPage from "./pages/RulesPage";
import SettingsPage from "./pages/SettingsPage";
import NewRunModal, { type NewRunConfig } from "./components/NewRunModal";
import Dialog from "./components/Dialog";
import { formatRunStamp } from "./lib/datetime";
import { bumpRuleHits, parseDelimited, policyFromRules, reconcileFiles } from "./lib/reconcile";
import { useHashRoute, type Page } from "./lib/route";
import { useWorkspace, type AuditAction, type AuditEvent } from "./lib/workspace";

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TxStatus, { label: string; dot: string; text: string }> = {
  matched: { label: "MATCHED", dot: "bg-[var(--status-match)]", text: "text-[var(--status-match)]" },
  mismatch: { label: "MISMATCH", dot: "bg-[var(--status-mismatch)]", text: "text-[var(--status-mismatch)]" },
  missing_settlement: { label: "MISSING STLMT", dot: "bg-[var(--status-warning)]", text: "text-[var(--status-warning)]" },
  missing_ledger: { label: "MISSING LEDGER", dot: "bg-[var(--status-warning)]", text: "text-[var(--status-warning)]" },
  partial: { label: "PARTIAL", dot: "bg-[var(--status-partial)]", text: "text-[var(--status-partial)]" },
};

const STATUS_SEVERITY: Record<TxStatus, number> = {
  mismatch: 0,
  missing_settlement: 1,
  missing_ledger: 2,
  partial: 3,
  matched: 4,
};

function StatusBadge({ status }: { status: TxStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-widest whitespace-nowrap ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function matchRateColor(rate: number) {
  if (rate >= 99) return "text-[var(--status-match)]";
  if (rate >= 95) return "text-[var(--status-warning)]";
  return "text-[var(--status-mismatch)]";
}

// ─── Delta cell ──────────────────────────────────────────────────────────────

function DeltaCell({ delta, status }: { delta: number | null; status: TxStatus }) {
  if (delta === null) return <span className="text-[var(--muted-foreground)] font-mono text-xs">—</span>;
  if (delta === 0) return <span className="font-mono text-xs text-[var(--status-match)]">0.00</span>;
  return (
    <span className={`font-mono text-xs font-medium whitespace-nowrap ${STATUS_CONFIG[status].text}`}>
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
  const matchRate = run.totalRecords === 0 ? 0 : (run.matched / run.totalRecords) * 100;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] transition-colors ${
        active ? "bg-[var(--secondary)]" : "hover:bg-[var(--card)]"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[11px] text-[var(--primary)]">{run.id}</span>
        <span className={`font-mono text-[11px] font-bold ${matchRateColor(matchRate)}`}>
          {run.status === "running" ? "…" : `${matchRate.toFixed(1)}%`}
        </span>
      </div>
      <div className="text-[11px] text-[var(--muted-foreground)] truncate">{run.ledgerFile}</div>
      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{formatRunStamp(run.timestamp)}</div>
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
    <div className="bg-[var(--card)] border border-[var(--border)] px-3 py-2.5 lg:px-4 lg:py-3 min-w-0">
      <div className={`font-mono text-xl lg:text-2xl font-bold leading-none mb-1 ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider lg:tracking-widest font-medium truncate" title={label}>
        {label}
      </div>
      {sub && <div className={`font-mono text-[11px] mt-1 ${color} opacity-80 truncate`} title={sub}>{sub}</div>}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

const ACTION_NOTE: Record<AuditAction, (id: string) => string> = {
  reviewed: (id) => `Marked ${id} as reviewed.`,
  escalated: (id) => `Escalated ${id} to controller.`,
  flagged: (id) => `Flagged ${id} for audit.`,
};

function DetailDrawer({
  tx,
  events,
  onClose,
  onAction,
}: {
  tx: Transaction;
  events: AuditEvent[];
  onClose: () => void;
  onAction: (action: AuditAction) => void;
}) {
  return (
    <Dialog onClose={onClose} labelledBy="tx-detail-title" variant="drawer">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)] z-10">
        <div>
          <div className="font-mono text-xs text-[var(--muted-foreground)] mb-0.5">TRANSACTION DETAIL</div>
          <h2 id="tx-detail-title" className="font-mono text-sm font-bold text-[var(--foreground)]">{tx.id}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close transaction detail"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono text-lg leading-none px-1 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        <StatusBadge status={tx.status} />

        <div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">Description</div>
          <div className="text-sm text-[var(--foreground)]">{tx.description}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" value={tx.date} mono />
          <Field label="Currency" value={tx.currency} mono />
          <Field label="Counterparty" value={tx.counterparty} />
          <Field label="Reference" value={tx.reference} mono />
        </div>

        <div className="border border-[var(--border)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Amounts</div>
          <dl className="divide-y divide-[var(--border)]">
            <AmountRow label="Ledger">{formatCurrency(tx.ledgerAmount, tx.currency)}</AmountRow>
            <AmountRow label="Settlement">{formatCurrency(tx.settlementAmount, tx.currency)}</AmountRow>
            <AmountRow label="Delta">
              <DeltaCell delta={tx.delta} status={tx.status} />
            </AmountRow>
          </dl>
        </div>

        {tx.notes && (
          <div className="bg-[var(--secondary)] border border-[var(--border)] px-4 py-3">
            <div className="text-[11px] uppercase tracking-widest text-[var(--status-warning)] mb-1.5">Analyst Note</div>
            <div className="text-xs text-[var(--foreground)] leading-relaxed">{tx.notes}</div>
          </div>
        )}

        <div className="pt-2 space-y-2">
          {events.length > 0 && (
            <div className="border border-[var(--border)] px-3 py-2 space-y-1.5">
              <div className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)]">Exception trail</div>
              {events.map((event) => (
                <div key={event.id} className="font-mono text-[11px] text-[var(--foreground)]">
                  {event.note}
                  <span className="text-[var(--muted-foreground)]"> · {formatRunStamp(event.at)}</span>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onAction("reviewed")}
            className="w-full font-mono text-xs bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] py-2 px-4 transition-colors text-left"
          >
            MARK AS REVIEWED
          </button>
          <button
            type="button"
            onClick={() => onAction("escalated")}
            className="w-full font-mono text-xs bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] py-2 px-4 transition-colors text-left"
          >
            ESCALATE TO CONTROLLER
          </button>
          <button
            type="button"
            onClick={() => onAction("flagged")}
            className="w-full font-mono text-xs text-[var(--status-mismatch)] hover:bg-[var(--border)] border border-[var(--status-mismatch)]/30 py-2 px-4 transition-colors text-left"
          >
            FLAG FOR AUDIT
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function AmountRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-[11px] text-[var(--muted-foreground)]">{label}</dt>
      <dd className="font-mono text-sm text-[var(--foreground)] text-right whitespace-nowrap">{children}</dd>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-0.5">{label}</div>
      <div className={`text-xs text-[var(--foreground)] break-words ${mono ? "font-mono" : ""}`}>{value}</div>
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

  function download() {
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.id}-audit-report.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <Dialog onClose={onClose} labelledBy="audit-title" className="max-w-[720px] max-h-[80vh]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <h2 id="audit-title" className="font-mono text-xs text-[var(--muted-foreground)] uppercase tracking-widest">
          Audit Report — {run.id}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close audit report"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono text-lg leading-none px-1 transition-colors"
        >
          ×
        </button>
      </div>
      <div className="overflow-auto flex-1 p-5">
        <pre className="font-mono text-[11px] text-[var(--foreground)] leading-relaxed whitespace-pre">{lines}</pre>
      </div>
      <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2">
        <button
          onClick={download}
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
    </Dialog>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const NAV: { page: Page; label: string }[] = [
  { page: "reconciliation", label: "RECONCILIATION" },
  { page: "reports", label: "REPORTS" },
  { page: "rules", label: "RULES" },
  { page: "settings", label: "SETTINGS" },
];

const ALL_FILTERS: { key: TxStatus | "all"; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "matched", label: "MATCHED" },
  { key: "mismatch", label: "MISMATCH" },
  { key: "missing_settlement", label: "MISSING STLMT" },
  { key: "missing_ledger", label: "MISSING LEDGER" },
  { key: "partial", label: "PARTIAL" },
];

const COLUMNS: { label: string; field: keyof Transaction; className: string; align?: "right" }[] = [
  { label: "ID", field: "id", className: "w-20" },
  { label: "DATE", field: "date", className: "w-24" },
  { label: "DESCRIPTION", field: "description", className: "" },
  { label: "COUNTERPARTY", field: "counterparty", className: "w-44" },
  { label: "LEDGER AMT", field: "ledgerAmount", className: "w-32", align: "right" },
  { label: "STLMT AMT", field: "settlementAmount", className: "w-32", align: "right" },
  { label: "CCY", field: "currency", className: "w-14" },
  { label: "DELTA", field: "delta", className: "w-28", align: "right" },
  { label: "STATUS", field: "status", className: "w-40" },
];

export default function App() {
  const { workspace, setRuns, setTransactions, setRules, setAudit } = useWorkspace();
  const { runs, transactions: allTransactions, rules, settings, audit } = workspace;
  const { route, navigate } = useHashRoute(runs[0]?.id ?? SEED_RUNS[0].id);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [filter, setFilter] = useState<TxStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [sortField, setSortField] = useState<keyof Transaction>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const activeRun = runs.find((r) => r.id === route.runId) ?? runs[0] ?? SEED_RUNS[0];
  const runTxs = useMemo(() => transactionsForRun(activeRun.id, allTransactions), [activeRun.id, allTransactions]);

  useEffect(() => {
    setPage(1);
    setSelectedTx(null);
  }, [activeRun.id, filter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<TxStatus | "all", number> = {
      all: runTxs.length,
      matched: 0,
      mismatch: 0,
      missing_settlement: 0,
      missing_ledger: 0,
      partial: 0,
    };
    for (const t of runTxs) counts[t.status]++;
    return counts;
  }, [runTxs]);

  const filtered = useMemo(() => {
    let rows = runTxs;
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
      if (sortField === "status") {
        const cmp = STATUS_SEVERITY[a.status] - STATUS_SEVERITY[b.status];
        return sortAsc ? cmp : -cmp;
      }
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
  }, [runTxs, filter, search, sortField, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(field: keyof Transaction) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === "status" || field === "date" ? true : false);
    }
    setPage(1);
  }

  function selectRun(run: ReconciliationRun) {
    navigate({ page: "reconciliation", runId: run.id }, "replace");
  }

  async function handleNewRun(config: NewRunConfig) {
    const [ledgerText, settlementText] = await Promise.all([config.ledgerFile.text(), config.settlementFile.text()]);
    const ledger = parseDelimited(ledgerText);
    const settlement = parseDelimited(settlementText);
    if (ledger.length === 0 && settlement.length === 0) {
      throw new Error("Neither file had readable rows. Use CSV with headers: date, description, amount, currency, reference, counterparty.");
    }
    const seq = String(runs.length + 1).padStart(3, "0");
    const id = `RUN-${config.runDate.replace(/-/g, "")}-${seq}`;
    const policy = policyFromRules(rules, settings.breakThreshold);
    const flagDuplicates = rules.some((r) => r.enabled && /duplicate/i.test(`${r.name} ${r.action}`));
    const txs = reconcileFiles(id, config.runDate, ledger, settlement, policy, { flagDuplicates });
    const next: ReconciliationRun = {
      id,
      timestamp: new Date().toISOString(),
      ledgerFile: config.ledgerFile.name,
      settlementFile: config.settlementFile.name,
      status: "complete",
      ...summarizeTransactions(txs),
    };
    setTransactions((prev) => [...prev, ...txs]);
    setRuns((rs) => [next, ...rs]);
    setRules((prev) => bumpRuleHits(prev, txs));
    navigate({ page: "reconciliation", runId: id }, "push");
    setShowNewRunModal(false);
  }

  function logAction(tx: Transaction, action: AuditAction) {
    const event: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      txId: tx.id,
      runId: tx.runId,
      action,
      at: new Date().toISOString(),
      note: ACTION_NOTE[action](tx.id),
    };
    setAudit((prev) => [event, ...prev]);
  }

  const latestAction = useMemo(() => {
    const map = new Map<string, AuditAction>();
    for (const event of audit) {
      if (!map.has(event.txId)) map.set(event.txId, event.action);
    }
    return map;
  }, [audit]);

  const matchRate = activeRun.totalRecords === 0 ? 0 : (activeRun.matched / activeRun.totalRecords) * 100;
  const issueCount =
    activeRun.mismatched + activeRun.missingSettlement + activeRun.missingLedger + activeRun.partial;
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="flex flex-col h-full bg-[var(--background)] text-[var(--foreground)]">
      {/* ── Topbar ── */}
      <header className="flex items-center gap-4 lg:gap-6 px-3 sm:px-5 h-11 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
            <rect x="2" y="2" width="7" height="7" fill="var(--primary)" />
            <rect x="11" y="2" width="7" height="7" fill="var(--border)" />
            <rect x="2" y="11" width="7" height="7" fill="var(--border)" />
            <rect x="11" y="11" width="7" height="7" fill="var(--primary)" opacity="0.5" />
          </svg>
          <span className="font-mono text-sm font-bold text-[var(--foreground)] tracking-tight">
            LEDGER<span className="text-[var(--primary)]">SYNC</span>
          </span>
        </div>

        <nav aria-label="Main" className="flex items-center h-full min-w-0 overflow-x-auto">
          {NAV.map(({ page, label }) => (
            <button
              key={page}
              onClick={() => navigate({ page })}
              aria-current={route.page === page ? "page" : undefined}
              className={`h-full px-3 sm:px-4 font-mono text-[11px] tracking-widest border-b-2 whitespace-nowrap transition-colors ${
                route.page === page
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto hidden lg:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)]" aria-hidden="true" />
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">SAMPLE DATA</span>
          </div>
          <div className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-2 py-0.5">
            MERIDIAN-NG · DEMO
          </div>
        </div>
      </header>

      <div className={route.page === "reports" ? "flex flex-1 min-h-0 overflow-hidden" : "hidden"}>
        <ReportsPage
          tab={route.reportsTab}
          onTabChange={(tab) => navigate({ page: "reports", reportsTab: tab })}
          runs={runs}
          transactions={allTransactions}
        />
      </div>
      <div className={route.page === "rules" ? "flex flex-1 min-h-0 overflow-hidden" : "hidden"}>
        <RulesPage />
      </div>
      <div className={route.page === "settings" ? "flex flex-1 min-h-0 overflow-hidden" : "hidden"}>
        <SettingsPage
          tab={route.settingsTab}
          onTabChange={(tab) => navigate({ page: "settings", settingsTab: tab })}
        />
      </div>

      <div className={route.page === "reconciliation" ? "flex flex-1 min-h-0 overflow-hidden" : "hidden"}>
        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar ── */}
          <aside
            aria-label="Run history"
            className="hidden md:flex w-56 border-r border-[var(--border)] flex-col bg-[var(--background)] shrink-0 overflow-y-auto"
          >
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <h2 className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Run History</h2>
              {runs.map((r) => (
                <RunCard key={r.id} run={r} active={r.id === activeRun.id} onClick={() => selectRun(r)} />
              ))}
            </div>

            <div className="px-3 py-3 mt-auto border-t border-[var(--border)]">
              <button
                onClick={() => setShowNewRunModal(true)}
                className="w-full font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 py-1.5 px-3 hover:bg-[var(--primary)]/10 transition-colors"
              >
                + NEW RUN
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* ── Run header ── */}
            <div className="px-3 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
              <div className="flex md:hidden items-center gap-2 mb-3">
                <label htmlFor="run-picker" className="sr-only">Reconciliation run</label>
                <div className="relative flex-1 min-w-0">
                  <select
                    id="run-picker"
                    value={activeRun.id}
                    onChange={(e) => selectRun(runs.find((r) => r.id === e.target.value) ?? runs[0])}
                    className="w-full appearance-none bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-mono text-xs px-3 py-2 pr-8 outline-none focus:border-[var(--primary)]"
                  >
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} · {r.totalRecords === 0 ? "…" : `${((r.matched / r.totalRecords) * 100).toFixed(1)}%`}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 12 12" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[var(--muted-foreground)]">
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowNewRunModal(true)}
                  className="shrink-0 font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 py-2 px-3 hover:bg-[var(--primary)]/10 transition-colors"
                >
                  + NEW RUN
                </button>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] mb-0.5 uppercase tracking-widest">
                    Active Reconciliation Run
                  </div>
                  <h1 className="font-mono text-sm font-bold text-[var(--foreground)]">{activeRun.id}</h1>
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5 break-all">
                    {activeRun.ledgerFile} ↔ {activeRun.settlementFile}
                  </div>
                </div>
                <button
                  onClick={() => setShowAudit(true)}
                  className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity uppercase tracking-widest whitespace-nowrap"
                >
                  Export Audit Report
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <StatTile
                  label="Match Rate"
                  value={`${matchRate.toFixed(1)}%`}
                  sub={`${activeRun.matched} / ${activeRun.totalRecords}`}
                  color={matchRateColor(matchRate)}
                />
                <StatTile label="Matched" value={activeRun.matched} color="text-[var(--status-match)]" />
                <StatTile label="Mismatched" value={activeRun.mismatched} color="text-[var(--status-mismatch)]" />
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
            <div className="flex flex-col md:flex-row md:items-center border-b border-[var(--border)] bg-[var(--background)] shrink-0">
              <div role="group" aria-label="Filter by status" className="flex items-center h-9 overflow-x-auto px-3 sm:px-5 min-w-0">
                {ALL_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={filter === f.key}
                    className={`h-full px-3 font-mono text-[11px] tracking-widest whitespace-nowrap transition-colors border-r border-[var(--border)] first:border-l ${
                      filter === f.key
                        ? "bg-[var(--secondary)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 opacity-60">{statusCounts[f.key]}</span>
                  </button>
                ))}
              </div>

              <div className="md:ml-auto flex items-center border-t md:border-t-0 border-[var(--border)]">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, description, reference…"
                  aria-label="Search transactions"
                  className="font-mono text-[11px] bg-transparent md:border-l border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] px-3 sm:px-5 md:px-3 h-9 w-full md:w-72 outline-none focus:bg-[var(--secondary)]"
                />
              </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[1100px] text-left ledger-table">
                <caption className="sr-only">Transactions for {activeRun.id}. Select a row to view details.</caption>
                <thead className="sticky top-0 bg-[var(--card)] z-10">
                  <tr className="border-b border-[var(--border)]">
                    {COLUMNS.map(({ label, field, className, align }) => {
                      const active = sortField === field;
                      return (
                        <th
                          key={field}
                          scope="col"
                          aria-sort={active ? (sortAsc ? "ascending" : "descending") : undefined}
                          className={`px-3 py-2 font-medium ${className} ${align === "right" ? "text-right" : ""}`}
                        >
                          <button
                            onClick={() => toggleSort(field)}
                            className={`inline-flex items-center gap-1 font-mono text-[11px] tracking-widest whitespace-nowrap transition-colors ${
                              active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            }`}
                          >
                            {label}
                            <span aria-hidden="true" className={`w-2 ${active ? "opacity-80" : "opacity-0"}`}>
                              {sortAsc ? "↑" : "↓"}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((tx) => (
                    <tr
                      key={tx.id}
                      tabIndex={0}
                      aria-label={`${tx.id}, ${tx.description}, ${STATUS_CONFIG[tx.status].label}${tx.notes?.includes("Duplicate reference") ? ", duplicate reference" : ""}${latestAction.get(tx.id) ? `, ${latestAction.get(tx.id)}` : ""}`}
                      className="border-b border-[var(--border)] cursor-pointer transition-colors"
                      onClick={() => setSelectedTx(tx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTx(tx);
                        }
                      }}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--primary)] whitespace-nowrap">{tx.id}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)] whitespace-nowrap">{tx.date}</td>
                      <td className="px-3 py-2 text-xs text-[var(--foreground)] max-w-0 truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[var(--foreground)] max-w-44 truncate" title={tx.counterparty}>
                        {tx.counterparty}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-right text-[var(--foreground)] whitespace-nowrap">
                        {formatCurrency(tx.ledgerAmount, tx.currency)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-right text-[var(--foreground)] whitespace-nowrap">
                        {formatCurrency(tx.settlementAmount, tx.currency)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">{tx.currency}</td>
                      <td className="px-3 py-2 text-right">
                        <DeltaCell delta={tx.delta} status={tx.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={tx.status} />
                          {tx.notes?.includes("Duplicate reference") && (
                            <span className="font-mono text-[10px] tracking-widest text-[var(--status-warning)] border border-[var(--status-warning)]/30 px-1 py-0.5">
                              DUP
                            </span>
                          )}
                          {latestAction.get(tx.id) && (
                            <span className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] border border-[var(--border)] px-1 py-0.5 uppercase">
                              {latestAction.get(tx.id)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-5 py-10 text-center font-mono text-xs text-[var(--muted-foreground)]">
                        NO RECORDS MATCH CURRENT FILTERS
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Footer ── */}
            <div className="px-3 sm:px-5 py-2 border-t border-[var(--border)] bg-[var(--card)] shrink-0 flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] text-[var(--muted-foreground)] whitespace-nowrap" aria-live="polite">
                {filtered.length === 0
                  ? `0 of ${runTxs.length} records`
                  : `${from}–${to} of ${filtered.length} records`}
                {filter !== "all" || search ? ` · ${runTxs.length} in run` : ""}
              </span>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-4">
                  {[
                    { color: "var(--status-match)", label: "Matched" },
                    { color: "var(--status-mismatch)", label: "Mismatch" },
                    { color: "var(--status-warning)", label: "Missing" },
                    { color: "var(--status-partial)", label: "Partial" },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>
                {pageCount > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="font-mono text-[11px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      PREV
                    </button>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] px-2">
                      {currentPage}/{pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="font-mono text-[11px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      NEXT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {selectedTx && (
        <DetailDrawer
          key={selectedTx.id}
          tx={selectedTx}
          events={audit.filter((e) => e.txId === selectedTx.id)}
          onClose={() => setSelectedTx(null)}
          onAction={(action) => logAction(selectedTx, action)}
        />
      )}
      {showAudit && <AuditModal run={activeRun} transactions={runTxs} onClose={() => setShowAudit(false)} />}
      {showNewRunModal && (
        <NewRunModal onClose={() => setShowNewRunModal(false)} onSubmit={handleNewRun} />
      )}
    </div>
  );
}
