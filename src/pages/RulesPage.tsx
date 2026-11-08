import { useState } from "react";
import FormRow from "../components/FormRow";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import TextArea from "../components/TextArea";

interface Rule {
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

const INITIAL_RULES: Rule[] = [
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
    condition: "settlement.amount < ledger.amount AND (ledger.amount - settlement.amount) <= 250 AND tx.type == WIRE",
    action: "STATUS = PARTIAL (fee deducted)",
    tolerance: "USD 250.00",
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

const CATEGORIES = ["All", "Matching", "Tolerance", "Timing", "Trade Finance", "Fraud / Error"];

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<Rule>>({
    name: "",
    category: "Matching",
    condition: "",
    action: "",
    tolerance: "",
    priority: rules.length + 1,
    enabled: true,
  });

  function setDraftField<K extends keyof Rule>(k: K, v: Rule[K]) {
    setDraft(d => ({ ...d, [k]: v }));
  }

  function toggleRule(id: string) {
    setRules(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function saveEdit(id: string) {
    setRules(rs => rs.map(r => r.id === id ? { ...r, ...draft } : r));
    setEditingId(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  function addRule(e: React.FormEvent) {
    e.preventDefault();
    const newRule: Rule = {
      id: `RULE-${String(rules.length + 1).padStart(3, "0")}`,
      name: draft.name || "Unnamed Rule",
      category: draft.category || "Matching",
      condition: draft.condition || "",
      action: draft.action || "",
      tolerance: draft.tolerance || "0",
      priority: draft.priority || rules.length + 1,
      enabled: true,
      hitCount: 0,
      lastHit: "—",
    };
    setRules(rs => [...rs, newRule]);
    setShowNewForm(false);
    setDraft({ name: "", category: "Matching", condition: "", action: "", tolerance: "", priority: rules.length + 2, enabled: true });
    setSaved(newRule.id);
    setTimeout(() => setSaved(null), 2000);
  }

  const visible = categoryFilter === "All" ? rules : rules.filter(r => r.category === categoryFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* sub-nav */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 border-b border-[var(--border)] bg-[var(--card)] h-9 shrink-0">
        <div role="group" aria-label="Filter by category" className="flex items-center gap-0 h-full min-w-0 overflow-x-auto">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              aria-pressed={categoryFilter === c}
              className={`h-full px-3 font-mono text-[11px] tracking-widest whitespace-nowrap border-r border-[var(--border)] transition-colors ${
                categoryFilter === c ? "bg-[var(--secondary)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowNewForm(v => !v); setEditingId(null); }}
          className="shrink-0 whitespace-nowrap font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1 hover:opacity-90 transition-opacity"
        >
          {showNewForm ? "CANCEL" : "+ NEW RULE"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="max-w-3xl space-y-3">

          {/* New rule form */}
          {showNewForm && (
            <div className="bg-[var(--card)] border border-[var(--primary)]/40">
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--secondary)] flex items-center justify-between">
                <span className="font-mono text-[11px] text-[var(--primary)] uppercase tracking-widest">NEW RULE</span>
              </div>
              <form onSubmit={addRule} className="px-5">
                <FormRow label="Rule Name">
                  <TextInput value={draft.name || ""} onChange={v => setDraftField("name", v)} placeholder="Descriptive rule name" />
                </FormRow>
                <FormRow label="Category">
                  <SelectInput value={draft.category || "Matching"} onChange={v => setDraftField("category", v)}>
                    {["Matching", "Tolerance", "Timing", "Trade Finance", "Fraud / Error"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Condition Expression" note="Uses LedgerSync expression language">
                  <TextArea
                    value={draft.condition || ""}
                    onChange={v => setDraftField("condition", v)}
                    rows={3}
                    placeholder="e.g. abs(ledger.amount - settlement.amount) / ledger.amount <= 0.01"
                  />
                </FormRow>
                <FormRow label="Action">
                  <TextArea
                    value={draft.action || ""}
                    onChange={v => setDraftField("action", v)}
                    rows={2}
                    placeholder="e.g. STATUS = PARTIAL; NOTIFY = controller"
                  />
                </FormRow>
                <FormRow label="Tolerance">
                  <TextInput value={draft.tolerance || ""} onChange={v => setDraftField("tolerance", v)} placeholder="e.g. 0.50%, USD 100, 1 day" />
                </FormRow>
                <FormRow label="Priority">
                  <TextInput type="number" value={String(draft.priority || "")} onChange={v => setDraftField("priority", parseInt(v) || 1)} placeholder="Lower = higher priority" />
                </FormRow>
                <div className="py-4 flex gap-2">
                  <button type="submit" className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 uppercase tracking-widest hover:opacity-90 transition-opacity">
                    ADD RULE
                  </button>
                  <button type="button" onClick={() => setShowNewForm(false)} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-2 hover:bg-[var(--secondary)] transition-colors">
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Rule list */}
          {visible.map(rule => (
            <div
              key={rule.id}
              className={`bg-[var(--card)] border transition-colors ${
                saved === rule.id ? "border-[var(--status-match)]/40" : "border-[var(--border)]"
              } ${!rule.enabled ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                {/* priority badge */}
                <div className="font-mono text-[11px] text-[var(--muted-foreground)] w-6 pt-0.5 shrink-0">#{rule.priority}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-[var(--foreground)]">{rule.name}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[var(--secondary)] text-[var(--muted-foreground)] uppercase">
                      {rule.category}
                    </span>
                    {saved === rule.id && (
                      <span className="font-mono text-[11px] text-[var(--status-match)]">✓ SAVED</span>
                    )}
                  </div>

                  {editingId === rule.id ? (
                    <div>
                      <FormRow label="Condition">
                        <TextArea value={draft.condition ?? rule.condition} onChange={v => setDraftField("condition", v)} rows={2} />
                      </FormRow>
                      <FormRow label="Action">
                        <TextArea value={draft.action ?? rule.action} onChange={v => setDraftField("action", v)} rows={2} />
                      </FormRow>
                      <FormRow label="Tolerance">
                        <TextInput value={draft.tolerance ?? rule.tolerance} onChange={v => setDraftField("tolerance", v)} />
                      </FormRow>
                      <div className="py-3 flex gap-2">
                        <button onClick={() => saveEdit(rule.id)} className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity">SAVE</button>
                        <button onClick={() => setEditingId(null)} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--secondary)] transition-colors">CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)] w-20 shrink-0">CONDITION</span>
                        <code className="font-mono text-[11px] text-[var(--foreground)] break-all">{rule.condition}</code>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)] w-20 shrink-0">ACTION</span>
                        <code className="font-mono text-[11px] text-[var(--foreground)]">{rule.action}</code>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)] w-20 shrink-0">TOLERANCE</span>
                        <code className="font-mono text-[11px] text-[var(--primary)]">{rule.tolerance}</code>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 mt-2">
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      HITS: <span className="text-[var(--foreground)]">{rule.hitCount}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      LAST: <span className="text-[var(--foreground)]">{rule.lastHit === "—" ? "—" : new Date(rule.lastHit).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setDraft({ condition: rule.condition, action: rule.action, tolerance: rule.tolerance });
                      setEditingId(editingId === rule.id ? null : rule.id);
                      setShowNewForm(false);
                    }}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-2.5 py-1 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`font-mono text-[11px] border px-2.5 py-1 transition-colors ${
                      rule.enabled
                        ? "text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--secondary)]"
                        : "text-[var(--status-match)] border-[var(--status-match)]/30 hover:bg-[var(--status-match)]/10"
                    }`}
                  >
                    {rule.enabled ? "DISABLE" : "ENABLE"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
