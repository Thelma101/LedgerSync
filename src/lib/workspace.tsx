import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { INITIAL_HISTORY, INITIAL_SCHEDULED, type HistoryRow, type ScheduledReport } from "../data/reports";
import { INITIAL_RULES, type Rule } from "../data/rules";
import { DEFAULT_SETTINGS, type Settings } from "../data/settings";
import { RUNS, TRANSACTIONS, type ReconciliationRun, type Transaction } from "../data/transactions";

export type AuditAction = "reviewed" | "escalated" | "flagged";

export interface AuditEvent {
  id: string;
  txId: string;
  runId: string;
  action: AuditAction;
  at: string;
  note: string;
}

export interface Workspace {
  version: 1;
  runs: ReconciliationRun[];
  transactions: Transaction[];
  rules: Rule[];
  settings: Settings;
  audit: AuditEvent[];
  scheduled: ScheduledReport[];
  reportHistory: HistoryRow[];
}

const KEY = "ledgersync.workspace.v1";

function seedWorkspace(): Workspace {
  return {
    version: 1,
    runs: RUNS,
    transactions: TRANSACTIONS,
    rules: INITIAL_RULES,
    settings: DEFAULT_SETTINGS,
    audit: [],
    scheduled: INITIAL_SCHEDULED,
    reportHistory: INITIAL_HISTORY,
  };
}

function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedWorkspace();
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    if (parsed.version !== 1 || !Array.isArray(parsed.runs) || !Array.isArray(parsed.transactions)) {
      return seedWorkspace();
    }
    return {
      version: 1,
      runs: parsed.runs,
      transactions: parsed.transactions,
      rules: Array.isArray(parsed.rules) ? parsed.rules : INITIAL_RULES,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : INITIAL_SCHEDULED,
      reportHistory: Array.isArray(parsed.reportHistory) ? parsed.reportHistory : INITIAL_HISTORY,
    };
  } catch {
    return seedWorkspace();
  }
}

function persist(ws: Workspace) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
  } catch {
    // Quota or private-mode block; keep working in memory.
  }
}

interface WorkspaceApi {
  workspace: Workspace;
  setRuns: (value: ReconciliationRun[] | ((prev: ReconciliationRun[]) => ReconciliationRun[])) => void;
  setTransactions: (value: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setRules: (value: Rule[] | ((prev: Rule[]) => Rule[])) => void;
  setSettings: (value: Settings | ((prev: Settings) => Settings)) => void;
  setAudit: (value: AuditEvent[] | ((prev: AuditEvent[]) => AuditEvent[])) => void;
  setScheduled: (value: ScheduledReport[] | ((prev: ScheduledReport[]) => ScheduledReport[])) => void;
  setReportHistory: (value: HistoryRow[] | ((prev: HistoryRow[]) => HistoryRow[])) => void;
  replaceWorkspace: (next: Workspace) => void;
  resetDemo: () => void;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace());

  useEffect(() => {
    persist(workspace);
  }, [workspace]);

  function patch<K extends keyof Workspace>(key: K, value: Workspace[K] | ((prev: Workspace[K]) => Workspace[K])) {
    setWorkspace((ws) => ({
      ...ws,
      [key]: typeof value === "function" ? (value as (prev: Workspace[K]) => Workspace[K])(ws[key]) : value,
    }));
  }

  const api: WorkspaceApi = {
    workspace,
    setRuns: (value) => patch("runs", value),
    setTransactions: (value) => patch("transactions", value),
    setRules: (value) => patch("rules", value),
    setSettings: (value) => patch("settings", value),
    setAudit: (value) => patch("audit", value),
    setScheduled: (value) => patch("scheduled", value),
    setReportHistory: (value) => patch("reportHistory", value),
    replaceWorkspace: (next) => setWorkspace(next),
    resetDemo: () => setWorkspace(seedWorkspace()),
  };

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function parseWorkspaceFile(raw: string): Workspace | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    if (parsed.version !== 1 || !Array.isArray(parsed.runs) || !Array.isArray(parsed.transactions)) return null;
    return {
      version: 1,
      runs: parsed.runs,
      transactions: parsed.transactions,
      rules: Array.isArray(parsed.rules) ? parsed.rules : INITIAL_RULES,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : INITIAL_SCHEDULED,
      reportHistory: Array.isArray(parsed.reportHistory) ? parsed.reportHistory : INITIAL_HISTORY,
    };
  } catch {
    return null;
  }
}
