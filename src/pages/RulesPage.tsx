import { useState } from "react";
import FormRow from "../components/FormRow";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import TextArea from "../components/TextArea";
import { formatDateTime } from "../lib/datetime";
import { useWorkspace } from "../lib/workspace";
import { type Rule } from "../data/rules";

const CATEGORIES = ["All", "Matching", "Tolerance", "Timing", "Trade Finance", "Fraud / Error"];

function emptyDraft(priority: number): Partial<Rule> {
  return { name: "", category: "Matching", condition: "", action: "", tolerance: "", priority, enabled: true };
}

export default function RulesPage() {
  const { workspace, setRules } = useWorkspace();
  const { rules } = workspace;
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newDraft, setNewDraft] = useState<Partial<Rule>>(emptyDraft(rules.length + 1));
  const [editDraft, setEditDraft] = useState<Partial<Rule>>({});

  function setNewField<K extends keyof Rule>(k: K, v: Rule[K]) {
    setNewDraft(d => ({ ...d, [k]: v }));
    setFormError(null);
  }

  function setEditField<K extends keyof Rule>(k: K, v: Rule[K]) {
    setEditDraft(d => ({ ...d, [k]: v }));
    setFormError(null);
  }

  function toggleRule(id: string) {
    setRules(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function validate(draft: Partial<Rule>, ignoreId?: string): string | null {
    if (!draft.name?.trim()) return "Rule name is required.";
    if (!draft.condition?.trim()) return "Condition expression is required.";
    if (!draft.action?.trim()) return "Action is required.";
    const priority = Number(draft.priority);
    if (!Number.isInteger(priority) || priority < 1) return "Priority must be a whole number of 1 or higher.";
    const clash = rules.find(r => r.priority === priority && r.id !== ignoreId);
    if (clash) return `Priority ${priority} is already used by ${clash.name}.`;
    return null;
  }

  function saveEdit(id: string) {
    const error = validate({ ...rules.find(r => r.id === id), ...editDraft }, id);
    if (error) {
      setFormError(error);
      return;
    }
    setRules(rs => rs.map(r => r.id === id ? { ...r, ...editDraft } : r));
    setEditingId(null);
    setEditDraft({});
    setFormError(null);
    setSaved(id);
    setTimeout(() => setSaved(null), 2000);
  }

  function addRule(e: React.FormEvent) {
    e.preventDefault();
    const error = validate(newDraft);
    if (error) {
      setFormError(error);
      return;
    }
    const newRule: Rule = {
      id: `RULE-${String(rules.length + 1).padStart(3, "0")}`,
      name: newDraft.name!.trim(),
      category: newDraft.category || "Matching",
      condition: newDraft.condition!.trim(),
      action: newDraft.action!.trim(),
      tolerance: newDraft.tolerance?.trim() || "0",
      priority: Number(newDraft.priority) || rules.length + 1,
      enabled: true,
      hitCount: 0,
      lastHit: "—",
    };
    setRules(rs => [...rs, newRule]);
    setShowNewForm(false);
    setNewDraft(emptyDraft(rules.length + 2));
    setFormError(null);
    setSaved(newRule.id);
    setTimeout(() => setSaved(null), 2000);
  }

  const visible = categoryFilter === "All" ? rules : rules.filter(r => r.category === categoryFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full min-h-0">
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
          onClick={() => {
            setShowNewForm(v => {
              if (!v) {
                setNewDraft(emptyDraft(rules.length + 1));
                setFormError(null);
              }
              return !v;
            });
            setEditingId(null);
            setEditDraft({});
          }}
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
                  <TextInput value={newDraft.name || ""} onChange={v => setNewField("name", v)} placeholder="Descriptive rule name" required />
                </FormRow>
                <FormRow label="Category">
                  <SelectInput value={newDraft.category || "Matching"} onChange={v => setNewField("category", v)}>
                    {["Matching", "Tolerance", "Timing", "Trade Finance", "Fraud / Error"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Condition Expression" note="Uses LedgerSync expression language">
                  <TextArea
                    value={newDraft.condition || ""}
                    onChange={v => setNewField("condition", v)}
                    rows={3}
                    placeholder="e.g. abs(ledger.amount - settlement.amount) / ledger.amount <= 0.01"
                  />
                </FormRow>
                <FormRow label="Action">
                  <TextArea
                    value={newDraft.action || ""}
                    onChange={v => setNewField("action", v)}
                    rows={2}
                    placeholder="e.g. STATUS = PARTIAL; NOTIFY = controller"
                  />
                </FormRow>
                <FormRow label="Tolerance">
                  <TextInput value={newDraft.tolerance || ""} onChange={v => setNewField("tolerance", v)} placeholder="e.g. 0.50%, NGN 100,000, 1 day" />
                </FormRow>
                <FormRow label="Priority">
                  <TextInput type="number" value={String(newDraft.priority || "")} onChange={v => setNewField("priority", parseInt(v) || 1)} placeholder="Lower = higher priority" />
                </FormRow>
                {formError && showNewForm && (
                  <p className="font-mono text-[11px] text-[var(--status-mismatch)] py-2">{formError}</p>
                )}
                <div className="py-4 flex gap-2">
                  <button type="submit" className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 uppercase tracking-widest hover:opacity-90 transition-opacity">
                    ADD RULE
                  </button>
                  <button type="button" onClick={() => { setShowNewForm(false); setFormError(null); }} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-4 py-2 hover:bg-[var(--secondary)] transition-colors">
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
                        <TextArea value={editDraft.condition ?? rule.condition} onChange={v => setEditField("condition", v)} rows={2} />
                      </FormRow>
                      <FormRow label="Action">
                        <TextArea value={editDraft.action ?? rule.action} onChange={v => setEditField("action", v)} rows={2} />
                      </FormRow>
                      <FormRow label="Tolerance">
                        <TextInput value={editDraft.tolerance ?? rule.tolerance} onChange={v => setEditField("tolerance", v)} />
                      </FormRow>
                      {formError && editingId === rule.id && (
                        <p className="font-mono text-[11px] text-[var(--status-mismatch)] py-2">{formError}</p>
                      )}
                      <div className="py-3 flex gap-2">
                        <button onClick={() => saveEdit(rule.id)} className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity">SAVE</button>
                        <button onClick={() => { setEditingId(null); setEditDraft({}); setFormError(null); }} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--secondary)] transition-colors">CANCEL</button>
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
                      LAST: <span className="text-[var(--foreground)]">{rule.lastHit === "—" ? "—" : formatDateTime(rule.lastHit)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      if (editingId === rule.id) {
                        setEditingId(null);
                        setEditDraft({});
                        setFormError(null);
                        return;
                      }
                      setEditDraft({ condition: rule.condition, action: rule.action, tolerance: rule.tolerance, name: rule.name, priority: rule.priority });
                      setEditingId(rule.id);
                      setShowNewForm(false);
                      setFormError(null);
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
