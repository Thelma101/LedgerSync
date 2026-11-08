import type { Rule } from "../data/rules";
import type { Transaction, TxStatus } from "../data/transactions";

export interface SourceRow {
  date: string;
  description: string;
  amount: number;
  currency: string;
  reference: string;
  counterparty: string;
}

const HEADER_ALIASES: Record<keyof SourceRow, string[]> = {
  date: ["date", "txn_date", "valuedate", "value_date", "posting_date"],
  description: ["description", "narration", "details", "particulars"],
  amount: ["amount", "amt", "value", "ledger_amount", "settlement_amount", "debit", "credit"],
  currency: ["currency", "ccy", "curr"],
  reference: ["reference", "ref", "txn_ref", "payment_ref", "session_id"],
  counterparty: ["counterparty", "beneficiary", "originator", "party", "customer"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function detectDelimiter(headerLine: string) {
  if (headerLine.includes("\t")) return "\t";
  if ((headerLine.match(/,/g) ?? []).length >= 2) return ",";
  if (headerLine.includes("|")) return "|";
  if (headerLine.includes(";")) return ";";
  return ",";
}

function splitLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseDelimited(text: string): SourceRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const indexFor = (field: keyof SourceRow) =>
    headers.findIndex((h) => HEADER_ALIASES[field].some((alias) => h === alias || h.endsWith(`_${alias}`)));

  const map = {
    date: indexFor("date"),
    description: indexFor("description"),
    amount: indexFor("amount"),
    currency: indexFor("currency"),
    reference: indexFor("reference"),
    counterparty: indexFor("counterparty"),
  };

  if (map.amount < 0 || map.reference < 0) return [];

  return lines.slice(1).map((line, i) => {
    const cells = splitLine(line, delimiter);
    const amount = parseAmount(cells[map.amount] ?? "0");
    return {
      date: map.date >= 0 ? cells[map.date] || "" : "",
      description: map.description >= 0 ? cells[map.description] || `Row ${i + 1}` : `Row ${i + 1}`,
      amount,
      currency: map.currency >= 0 ? (cells[map.currency] || "NGN").toUpperCase() : "NGN",
      reference: cells[map.reference] || `ROW-${i + 1}`,
      counterparty: map.counterparty >= 0 ? cells[map.counterparty] || "Unknown" : "Unknown",
    };
  });
}

function keyOf(row: SourceRow) {
  return `${row.reference.trim().toUpperCase()}|${row.currency}|${row.date}`;
}

export interface MatchPolicy {
  percent: number;
  absAmount: number;
}

export function policyFromRules(rules: Pick<Rule, "enabled" | "tolerance">[], breakThreshold: string): MatchPolicy {
  let percent = 0;
  for (const rule of rules.filter((r) => r.enabled)) {
    const pct = rule.tolerance.replace(/,/g, "").match(/([\d.]+)\s*%/);
    if (pct) percent = Math.max(percent, Number(pct[1]) / 100);
  }
  return { percent, absAmount: Number(breakThreshold) || 0 };
}

function classify(ledgerAmount: number, settlementAmount: number, policy: MatchPolicy): TxStatus {
  const delta = settlementAmount - ledgerAmount;
  if (delta === 0) return "matched";
  const ratio = Math.abs(delta) / Math.max(Math.abs(ledgerAmount), 1);
  if ((policy.percent > 0 && ratio <= policy.percent) || (policy.absAmount > 0 && Math.abs(delta) <= policy.absAmount)) {
    return "partial";
  }
  return "mismatch";
}

export function reconcileFiles(
  runId: string,
  runDate: string,
  ledger: SourceRow[],
  settlement: SourceRow[],
  policy: MatchPolicy = { percent: 0.005, absAmount: 100 },
  options: { flagDuplicates?: boolean } = {},
): Transaction[] {
  const used = new Set<number>();
  const txs: Transaction[] = [];
  let seq = 1;

  for (const row of ledger) {
    const idx = settlement.findIndex((s, i) => !used.has(i) && keyOf(s) === keyOf(row));
    const id = `TXN-${runDate.replace(/-/g, "").slice(4)}-${String(seq++).padStart(4, "0")}`;
    if (idx === -1) {
      txs.push({
        id,
        runId,
        date: row.date || runDate,
        description: row.description,
        ledgerAmount: row.amount,
        settlementAmount: null,
        currency: row.currency,
        reference: row.reference,
        counterparty: row.counterparty,
        status: "missing_settlement",
        delta: null,
        notes: "No matching settlement row for this ledger reference.",
      });
      continue;
    }
    used.add(idx);
    const stlmt = settlement[idx];
    const status = classify(row.amount, stlmt.amount, policy);
    const delta = stlmt.amount - row.amount;
    txs.push({
      id,
      runId,
      date: row.date || runDate,
      description: row.description,
      ledgerAmount: row.amount,
      settlementAmount: stlmt.amount,
      currency: row.currency,
      reference: row.reference,
      counterparty: row.counterparty,
      status,
      delta,
      notes:
        status === "matched"
          ? undefined
          : status === "partial"
            ? `Variance within ${policy.percent ? `${(policy.percent * 100).toFixed(2)}%` : "n/a"} / ₦${policy.absAmount.toLocaleString("en-NG")} tolerance.`
            : `Amount break of ${delta.toLocaleString("en-NG")}.`,
    });
  }

  settlement.forEach((row, i) => {
    if (used.has(i)) return;
    txs.push({
      id: `TXN-${runDate.replace(/-/g, "").slice(4)}-${String(seq++).padStart(4, "0")}`,
      runId,
      date: row.date || runDate,
      description: row.description,
      ledgerAmount: null,
      settlementAmount: row.amount,
      currency: row.currency,
      reference: row.reference,
      counterparty: row.counterparty,
      status: "missing_ledger",
      delta: null,
      notes: "Settlement row has no matching ledger posting.",
    });
  });

  if (options.flagDuplicates) {
    const counts = new Map<string, number>();
    for (const tx of txs) {
      const key = tx.reference.trim().toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const tx of txs) {
      if ((counts.get(tx.reference.trim().toUpperCase()) ?? 0) < 2) continue;
      tx.notes = [tx.notes, "Duplicate reference in this run."].filter(Boolean).join(" ");
    }
  }

  return txs;
}

export function bumpRuleHits(rules: Rule[], txs: Transaction[]): Rule[] {
  const now = new Date().toISOString();
  const matched = txs.filter((t) => t.status === "matched").length;
  const partial = txs.filter((t) => t.status === "partial").length;
  const dups = txs.filter((t) => t.notes?.includes("Duplicate reference")).length;
  return rules.map((rule) => {
    if (!rule.enabled) return rule;
    let extra = 0;
    if (/exact/i.test(rule.name)) extra = matched;
    else if (/%/.test(rule.tolerance)) extra = partial;
    else if (/duplicate/i.test(`${rule.name} ${rule.action}`)) extra = dups;
    if (!extra) return rule;
    return { ...rule, hitCount: rule.hitCount + extra, lastHit: now };
  });
}
