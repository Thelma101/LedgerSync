export interface Rule {
  id: string;
  name: string;
  category: string;
  condition: string;
  action: string;
  tolerance: string;
  priority: number;
  enabled: boolean;
  hitCount: number;
  lastHit: string;
}

export const INITIAL_RULES: Rule[] = [
  {
    id: "RULE-001",
    name: "Exact Amount Match",
    category: "Matching",
    condition: "ledger.amount == settlement.amount AND ledger.currency == settlement.currency",
    action: "STATUS = MATCHED",
    tolerance: "0.00",
    priority: 1,
    enabled: true,
    hitCount: 441,
    lastHit: "2026-08-24T09:14:30Z",
  },
  {
    id: "RULE-002",
    name: "FX Rate Variance Tolerance",
    category: "Tolerance",
    condition: "abs(ledger.amount - settlement.amount) / ledger.amount <= 0.005 AND tx.type == FX_CONVERSION",
    action: "STATUS = PARTIAL (acceptable variance)",
    tolerance: "0.50%",
    priority: 2,
    enabled: true,
    hitCount: 4,
    lastHit: "2026-08-24T08:55:12Z",
  },
  {
    id: "RULE-003",
    name: "Bank Fee Deduction — Wire",
    category: "Tolerance",
    condition: "settlement.amount < ledger.amount AND (ledger.amount - settlement.amount) <= 250000 AND tx.rail == WIRE",
    action: "STATUS = PARTIAL (fee deducted)",
    tolerance: "NGN 250,000.00",
    priority: 3,
    enabled: true,
    hitCount: 7,
    lastHit: "2026-08-24T09:01:44Z",
  },
  {
    id: "RULE-004",
    name: "T+1 Settlement Hold",
    category: "Timing",
    condition: "settlement.amount IS NULL AND tx.type IN (CRYPTO, BOND_SETTLEMENT) AND days_since(tx.date) <= 1",
    action: "STATUS = PENDING (T+1 expected)",
    tolerance: "1 business day",
    priority: 4,
    enabled: true,
    hitCount: 2,
    lastHit: "2026-08-24T08:30:00Z",
  },
  {
    id: "RULE-005",
    name: "LC Tolerance UCP 600",
    category: "Trade Finance",
    condition: "abs(ledger.amount - settlement.amount) / ledger.amount <= 0.005 AND tx.type == LETTER_OF_CREDIT",
    action: "STATUS = PARTIAL (within LC tolerance)",
    tolerance: "0.50% per UCP 600 Art.18(b)",
    priority: 5,
    enabled: true,
    hitCount: 1,
    lastHit: "2026-08-24T09:05:21Z",
  },
  {
    id: "RULE-006",
    name: "Duplicate Reference Flag",
    category: "Fraud / Error",
    condition: "COUNT(tx.reference) > 1 WITHIN run",
    action: "FLAG = DUPLICATE_REFERENCE; STATUS = REVIEW",
    tolerance: "0",
    priority: 6,
    enabled: true,
    hitCount: 0,
    lastHit: "—",
  },
];
