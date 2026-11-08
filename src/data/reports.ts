export interface HistoryRow {
  id: string;
  name: string;
  generated: string;
  format: string;
  size: string;
  run: string;
  status: string;
  body: string;
}

export interface ScheduledReport {
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

export const INITIAL_SCHEDULED: ScheduledReport[] = [
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

export const INITIAL_HISTORY: HistoryRow[] = [
  { id: "RPT-20260824-001", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-24T09:14:50Z", format: "PDF", size: "142 KB", run: "RUN-2026-08-24-001", status: "ready", body: "Sample retained report." },
  { id: "RPT-20260823-003", name: "Weekly Exception & Break Report", generated: "2026-08-23T18:01:22Z", format: "XLSX", size: "88 KB", run: "RUN-2026-08-23-003", status: "ready", body: "Sample retained report." },
  { id: "RPT-20260823-002", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-23T16:00:45Z", format: "PDF", size: "131 KB", run: "RUN-2026-08-23-003", status: "ready", body: "Sample retained report." },
  { id: "RPT-20260822-001", name: "Daily EOD NIBSS Reconciliation Summary", generated: "2026-08-22T16:00:33Z", format: "PDF", size: "119 KB", run: "RUN-2026-08-22-002", status: "ready", body: "Sample retained report." },
];
