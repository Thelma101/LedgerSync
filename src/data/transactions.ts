export type TxStatus = "matched" | "mismatch" | "missing_settlement" | "missing_ledger" | "partial";

export interface Transaction {
  id: string;
  runId: string;
  date: string;
  description: string;
  ledgerAmount: number | null;
  settlementAmount: number | null;
  currency: string;
  reference: string;
  counterparty: string;
  status: TxStatus;
  delta: number | null;
  notes?: string;
}

export interface ReconciliationRun {
  id: string;
  timestamp: string;
  ledgerFile: string;
  settlementFile: string;
  totalRecords: number;
  matched: number;
  mismatched: number;
  missingSettlement: number;
  missingLedger: number;
  partial: number;
  status: "complete" | "running" | "failed";
}

interface RunSeed {
  id: string;
  timestamp: string;
  ledgerFile: string;
  settlementFile: string;
  date: string;
  status: ReconciliationRun["status"];
  targets: Record<TxStatus, number>;
  rngSeed: number;
}

const RUN_SEEDS: RunSeed[] = [
  {
    id: "RUN-2026-08-24-001",
    timestamp: "2026-08-24T09:14:32Z",
    ledgerFile: "ledger_2026-08-24.csv",
    settlementFile: "nibss_eft_20260824.txt",
    date: "2026-08-24",
    status: "complete",
    targets: { matched: 441, mismatch: 23, missing_settlement: 11, missing_ledger: 8, partial: 4 },
    rngSeed: 24001,
  },
  {
    id: "RUN-2026-08-23-003",
    timestamp: "2026-08-23T17:02:07Z",
    ledgerFile: "ledger_2026-08-23.csv",
    settlementFile: "nibss_eft_20260823.txt",
    date: "2026-08-23",
    status: "complete",
    targets: { matched: 499, mismatch: 7, missing_settlement: 3, missing_ledger: 2, partial: 1 },
    rngSeed: 23003,
  },
  {
    id: "RUN-2026-08-22-002",
    timestamp: "2026-08-22T16:55:44Z",
    ledgerFile: "ledger_2026-08-22.csv",
    settlementFile: "nibss_eft_20260822.txt",
    date: "2026-08-22",
    status: "complete",
    targets: { matched: 391, mismatch: 5, missing_settlement: 2, missing_ledger: 0, partial: 0 },
    rngSeed: 22002,
  },
];

const NAMED: Transaction[] = [
  {
    id: "TXN-0001",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "NIBSS Instant Payment — Dangote Industries Settlement",
    ledgerAmount: 48_250_000,
    settlementAmount: 48_250_000,
    currency: "NGN",
    reference: "NIBSS-NIP-20260824-0041",
    counterparty: "Dangote Industries Ltd",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0002",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "NEFT Credit — MTN Nigeria Communications Invoice #8821",
    ledgerAmount: 125_000_000,
    settlementAmount: 124_875_000,
    currency: "NGN",
    reference: "NEFT-MTN-20260824",
    counterparty: "MTN Nigeria Communications Plc",
    status: "mismatch",
    delta: -125_000,
    notes: "Settlement short by ₦125,000. Likely CBN e-levy deducted at source by correspondent bank.",
  },
  {
    id: "TXN-0003",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "RTGS Transfer — Zenith Bank Interbank Credit",
    ledgerAmount: 840_000_000,
    settlementAmount: null,
    currency: "NGN",
    reference: "RTGS-ZBL-20260824-002",
    counterparty: "Zenith Bank Plc",
    status: "missing_settlement",
    delta: null,
    notes: "No matching NIBSS settlement entry found. Expected same-day RTGS credit. Escalated to treasury ops.",
  },
  {
    id: "TXN-0004",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "POS Settlement — Interswitch Batch 0082",
    ledgerAmount: 19_847_320,
    settlementAmount: 19_847_320,
    currency: "NGN",
    reference: "ISW-BATCH-0082-20260824",
    counterparty: "Interswitch Financial Inclusion Services",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0005",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "FX Purchase — USD/NGN Trade Settlement Flutterwave",
    ledgerAmount: 32_500_000,
    settlementAmount: 32_641_800,
    currency: "NGN",
    reference: "FX-USD-NGN-20260824-07",
    counterparty: "Flutterwave Technology Solutions",
    status: "partial",
    delta: 141_800,
    notes: "FX rate variance of 0.44%. Within RULE-002 FX tolerance (0.50%). Ledger booked at ₦1,569.20/USD; settlement at ₦1,576.02/USD.",
  },
  {
    id: "TXN-0006",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Interbank Overnight Settlement — First Bank",
    ledgerAmount: null,
    settlementAmount: 500_000_000,
    currency: "NGN",
    reference: "IBL-FNBL-20260824-RECON",
    counterparty: "First Bank of Nigeria Ltd",
    status: "missing_ledger",
    delta: null,
    notes: "Settlement credit present in NIBSS file but no matching ledger debit found. Possible ERP batch delay.",
  },
  {
    id: "TXN-0007",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Mobile Money Payout Batch — Opay",
    ledgerAmount: 7_200_000,
    settlementAmount: 7_200_000,
    currency: "NGN",
    reference: "OPAY-BATCH-20260824-A",
    counterparty: "Opay Digital Services Ltd",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0008",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Direct Debit — NNPC Gas Supply Invoice",
    ledgerAmount: 144_392_180,
    settlementAmount: 144_200_000,
    currency: "NGN",
    reference: "NNPC-20260824-INV-2041",
    counterparty: "Nigerian National Petroleum Corp",
    status: "partial",
    delta: -192_180,
    notes: "Partial match. Ledger shows three line items consolidated; settlement shows one bulk debit.",
  },
  {
    id: "TXN-0009",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "SWIFT MT103 — GTBank UK Correspondent Remittance",
    ledgerAmount: 22_000_000,
    settlementAmount: 22_000_000,
    currency: "NGN",
    reference: "SWIFT-MT103-GTBUK-20260824",
    counterparty: "Guaranty Trust Bank UK",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0010",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "NIBSS NIP — Airtel Nigeria Airtime Revenue Pool",
    ledgerAmount: 88_000_000,
    settlementAmount: null,
    currency: "NGN",
    reference: "NIP-AIRTEL-20260824-BLK",
    counterparty: "Airtel Networks (Nigeria) Ltd",
    status: "missing_settlement",
    delta: null,
    notes: "T+1 settlement expected per bilateral agreement. Flag for review if not received by next business day.",
  },
  {
    id: "TXN-0011",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Card Acquirer Settlement — Verve Batch Aug-24",
    ledgerAmount: 31_482_600,
    settlementAmount: 31_482_600,
    currency: "NGN",
    reference: "VERVE-ACQ-BATCH-0054",
    counterparty: "Verve International",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0012",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Subscription Revenue — Paystack Monthly Sweep",
    ledgerAmount: 5_620_000,
    settlementAmount: 5_734_500,
    currency: "NGN",
    reference: "PAYSTACK-20260824-SWEEP",
    counterparty: "Paystack Payments Ltd",
    status: "mismatch",
    delta: 114_500,
    notes: "Settlement higher than booked. Likely includes prior-period correction applied by processor.",
  },
  {
    id: "TXN-0013",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "CBN Standing Order — Monetary Policy Settlement",
    ledgerAmount: null,
    settlementAmount: 175_000_000,
    currency: "NGN",
    reference: "CBN-STO-20260824-009",
    counterparty: "Central Bank of Nigeria",
    status: "missing_ledger",
    delta: null,
    notes: "Settlement entry received from CBN RTGS. Ledger posting delayed — ERP batch window missed.",
  },
  {
    id: "TXN-0014",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Payroll NEFT Batch — August Salary Run",
    ledgerAmount: 284_910_500,
    settlementAmount: 284_910_500,
    currency: "NGN",
    reference: "PAYROLL-20260824-AUG-F",
    counterparty: "Systemspecs (Remita)",
    status: "matched",
    delta: 0,
  },
  {
    id: "TXN-0015",
    runId: "RUN-2026-08-24-001",
    date: "2026-08-24",
    description: "Trade Finance LC Settlement — Lafarge Africa Cement",
    ledgerAmount: 66_000_000,
    settlementAmount: 65_780_000,
    currency: "NGN",
    reference: "TF-LC-20260824-LAFARGEAFR",
    counterparty: "Lafarge Africa Plc",
    status: "partial",
    delta: -220_000,
    notes: "Discrepancy within LC tolerance (0.33%). Acceptable under UCP 600 Art. 18(b). Marked for controller sign-off.",
  },
];

const COUNTERPARTIES = [
  "Access Bank Plc",
  "United Bank for Africa",
  "Stanbic IBTC Bank",
  "Fidelity Bank Plc",
  "Wema Bank Plc",
  "Union Bank of Nigeria",
  "FCMB Ltd",
  "Polaris Bank Ltd",
  "Globus Bank Ltd",
  "Providus Bank",
];

const DESCRIPTIONS = [
  "NIBSS Instant Payment — Merchant settlement",
  "NEFT Credit — Supplier invoice",
  "POS Settlement — Acquirer batch",
  "Mobile Money Payout — Wallet sweep",
  "Card Acquirer Settlement — Verve batch",
  "RTGS Transfer — Interbank credit",
  "Direct Debit — Utility invoice",
  "Payroll NEFT — Salary run",
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function roundAmount(rng: () => number, min = 250_000, max = 80_000_000) {
  return Math.round(min + rng() * (max - min));
}

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

function generateForRun(seed: RunSeed, named: Transaction[]): Transaction[] {
  const rng = mulberry32(seed.rngSeed);
  const existing = named.filter((t) => t.runId === seed.id);
  const have: Record<TxStatus, number> = {
    matched: 0,
    mismatch: 0,
    missing_settlement: 0,
    missing_ledger: 0,
    partial: 0,
  };
  for (const t of existing) have[t.status]++;

  const generated: Transaction[] = [];
  let seq = existing.length + 1;
  const dateToken = seed.date.replace(/-/g, "").slice(4);

  (Object.keys(seed.targets) as TxStatus[]).forEach((status) => {
    const needed = Math.max(0, seed.targets[status] - have[status]);
    for (let i = 0; i < needed; i++) {
      const amount = roundAmount(rng);
      const counterparty = pick(rng, COUNTERPARTIES);
      const description = pick(rng, DESCRIPTIONS);
      const id = `TXN-${dateToken}-${pad(seq++, 4)}`;
      const reference = `NIBSS-${dateToken}-${pad(seq, 5)}`;
      let ledgerAmount: number | null = amount;
      let settlementAmount: number | null = amount;
      let delta: number | null = 0;
      let notes: string | undefined;

      if (status === "mismatch") {
        delta = Math.round((rng() > 0.5 ? 1 : -1) * (80_000 + rng() * 400_000));
        settlementAmount = amount + delta;
        notes = "Amount break exceeds configured NGN 100 mismatch threshold.";
      } else if (status === "partial") {
        delta = Math.round(amount * (0.002 + rng() * 0.002) * (rng() > 0.5 ? 1 : -1));
        settlementAmount = amount + delta;
        notes = "Variance within configured tolerance. Awaiting controller sign-off.";
      } else if (status === "missing_settlement") {
        settlementAmount = null;
        delta = null;
        notes = "Ledger entry has no matching settlement record in this file.";
      } else if (status === "missing_ledger") {
        ledgerAmount = null;
        delta = null;
        notes = "Settlement entry has no matching ledger posting in this file.";
      }

      generated.push({
        id,
        runId: seed.id,
        date: seed.date,
        description,
        ledgerAmount,
        settlementAmount,
        currency: "NGN",
        reference,
        counterparty,
        status,
        delta,
        notes,
      });
    }
  });

  return [...existing, ...generated];
}

export function summarizeTransactions(txs: Transaction[]) {
  const counts = {
    totalRecords: txs.length,
    matched: 0,
    mismatched: 0,
    missingSettlement: 0,
    missingLedger: 0,
    partial: 0,
  };
  for (const t of txs) {
    if (t.status === "matched") counts.matched++;
    else if (t.status === "mismatch") counts.mismatched++;
    else if (t.status === "missing_settlement") counts.missingSettlement++;
    else if (t.status === "missing_ledger") counts.missingLedger++;
    else counts.partial++;
  }
  return counts;
}

function buildRun(seed: RunSeed, txs: Transaction[]): ReconciliationRun {
  return {
    id: seed.id,
    timestamp: seed.timestamp,
    ledgerFile: seed.ledgerFile,
    settlementFile: seed.settlementFile,
    status: seed.status,
    ...summarizeTransactions(txs.filter((t) => t.runId === seed.id)),
  };
}

export const TRANSACTIONS: Transaction[] = RUN_SEEDS.flatMap((seed) => generateForRun(seed, NAMED));

export const RUNS: ReconciliationRun[] = RUN_SEEDS.map((seed) => buildRun(seed, TRANSACTIONS));

export function transactionsForRun(runId: string, source = TRANSACTIONS): Transaction[] {
  return source.filter((t) => t.runId === runId);
}

export function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (delta === 0) return "0.00";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
