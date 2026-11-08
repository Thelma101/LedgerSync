import { useEffect, useRef, useState } from "react";
import FormRow from "../components/FormRow";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import Toggle from "../components/Toggle";
import Flash from "../components/Flash";
import { SETTINGS_TABS, type SettingsTab } from "../lib/route";
import { DEFAULT_SETTINGS, type Settings } from "../data/settings";
import { parseWorkspaceFile, useWorkspace } from "../lib/workspace";

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-mono text-xs font-bold text-[var(--foreground)] uppercase tracking-widest">{title}</h3>
      <p className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5">{description}</p>
    </div>
  );
}

function SaveBar({ dirty, onSave, onDiscard, saved }: {
  dirty: boolean; onSave: () => void; onDiscard: () => void; saved: boolean;
}) {
  if (!dirty && !saved) return null;
  return (
    <div role="status" className={`fixed bottom-5 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)] flex flex-wrap items-center gap-3 px-5 py-3 border z-30 shadow-lg ${
      saved ? "bg-[var(--status-match)]/10 border-[var(--status-match)]/30" : "bg-[var(--secondary)] border-[var(--border)]"
    }`}>
      {saved ? (
        <span className="font-mono text-[11px] text-[var(--status-match)]">✓ Settings saved</span>
      ) : (
        <>
          <span className="font-mono text-[11px] text-[var(--foreground)]">You have unsaved changes</span>
          <button onClick={onSave} className="font-mono text-[11px] bg-[var(--primary)] text-[var(--primary-foreground)] px-3 py-1.5 hover:opacity-90 transition-opacity">SAVE CHANGES</button>
          <button onClick={onDiscard} className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--secondary)] transition-colors">DISCARD</button>
        </>
      )}
    </div>
  );
}

export default function SettingsPage({
  tab,
  onTabChange,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  const { workspace, setSettings, replaceWorkspace, resetDemo } = useWorkspace();
  const importRef = useRef<HTMLInputElement>(null);
  const [committed, setCommitted] = useState<Settings>(workspace.settings);
  const [draft, setDraft] = useState<Settings>(workspace.settings);
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [keyFileName, setKeyFileName] = useState("ed25519_recon.pub");
  const [apiKey, setApiKey] = useState("lsk_live_••••••••••••••••••••••••••••••••");
  const [webhookSecret, setWebhookSecret] = useState(DEFAULT_SETTINGS.webhookSecret);
  const [testing, setTesting] = useState<"ledger" | "settlement" | "webhook" | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(committed);

  function flashMsg(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 3200);
  }

  function testConnection(kind: "ledger" | "settlement") {
    setTesting(kind);
    window.setTimeout(() => {
      setTesting(null);
      if (kind === "ledger") {
        flashMsg(`Demo only — no live SFTP. Host ${draft.ledgerHost} and path ${draft.ledgerPath} look valid.`);
      } else {
        flashMsg(`Demo only — no live ${draft.stlmtType.toUpperCase()} hop. Queue ${draft.swiftQueue} is recorded locally.`);
      }
    }, 700);
  }

  function rotateApiKey() {
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    setApiKey(`lsk_demo_${token}`);
    flashMsg("API key rotated in this browser session. Copy it now — a live backend is not connected.");
  }

  function rotateWebhookSecret() {
    const token = Math.random().toString(36).slice(2, 18);
    setWebhookSecret(`wh_sec_${token}`);
    setDraft((d) => ({ ...d, webhookSecret: `wh_sec_${token}` }));
    flashMsg("Webhook signing secret rotated in this browser session.");
  }

  function sendTestPayload() {
    setTesting("webhook");
    window.setTimeout(() => {
      setTesting(null);
      flashMsg(`Would POST a sample run.complete event to ${draft.webhookUrl}. This demo does not send network requests.`);
    }, 600);
  }

  function set<K extends keyof Settings>(k: K) {
    return (v: Settings[K]) => {
      setDraft((d) => ({ ...d, [k]: v }));
      setSaved(false);
    };
  }

  useEffect(() => {
    setCommitted(workspace.settings);
    setDraft(workspace.settings);
  }, [workspace.settings]);

  function save() {
    setCommitted(draft);
    setSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function discard() {
    setDraft(committed);
    setSaved(false);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full min-h-0">
      <Flash message={flash} />
      {/* sub-nav */}
      <div className="flex items-center gap-0 px-3 sm:px-5 border-b border-[var(--border)] bg-[var(--card)] h-9 shrink-0 overflow-x-auto">
        {SETTINGS_TABS.map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            aria-pressed={tab === t}
            className={`h-full px-4 font-mono text-[11px] tracking-widest whitespace-nowrap border-r border-[var(--border)] transition-colors ${
              tab === t ? "bg-[var(--secondary)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-20">
        <div className="max-w-2xl">

          {/* ── GENERAL ── */}
          {tab === "GENERAL" && (
            <>
              <SectionHeader title="General Settings" description="Organization profile, run behavior, and data retention." />
              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <FormRow label="Organization Name">
                  <TextInput value={draft.orgName} onChange={set("orgName")} placeholder="Your organization" />
                </FormRow>
                <FormRow label="Default Timezone">
                  <SelectInput value={draft.timezone} onChange={set("timezone")}>
                    {["Africa/Lagos", "UTC", "America/New_York", "Europe/London", "Europe/Frankfurt", "Asia/Dubai", "Asia/Singapore"].map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Base Currency">
                  <SelectInput value={draft.currency} onChange={set("currency")}>
                    {["NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "XOF"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Fiscal Year End" note="MM-DD format">
                  <TextInput value={draft.fiscalYearEnd} onChange={set("fiscalYearEnd")} placeholder="12-31" />
                </FormRow>
                <FormRow label="Report Retention" note="Days to keep generated reports">
                  <div className="flex items-center gap-2">
                    <TextInput value={draft.retentionDays} onChange={set("retentionDays")} type="number" />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">days</span>
                  </div>
                </FormRow>
              </div>

              <div className="mt-4 bg-[var(--card)] border border-[var(--border)] px-5">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Automated Reconciliation</div>
                  <Toggle
                    checked={draft.autoRun}
                    onChange={set("autoRun")}
                    label="Enable daily auto-run"
                    description="Automatically trigger reconciliation at the scheduled time each business day."
                  />
                </div>
                {draft.autoRun && (
                  <FormRow label="Run Time" note={draft.timezone}>
                    <TextInput type="time" value={draft.autoRunTime} onChange={set("autoRunTime")} />
                  </FormRow>
                )}
                <FormRow label="Break Amount Threshold" note="Minimum delta to flag as mismatch">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{draft.currency === "NGN" ? "₦" : draft.currency}</span>
                    <TextInput value={draft.breakThreshold} onChange={set("breakThreshold")} type="number" placeholder="0.01" />
                  </div>
                </FormRow>
              </div>

              <div className="mt-4 bg-[var(--card)] border border-[var(--border)] px-5 py-4">
                <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-2">This browser</div>
                <p className="font-mono text-[11px] text-[var(--foreground)] leading-relaxed mb-3">
                  Runs, rules, settings, and exception actions are stored here until a server database is connected.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `ledgersync-workspace-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 0);
                      flashMsg("Downloaded workspace JSON from this browser.");
                    }}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    EXPORT WORKSPACE
                  </button>
                  <input
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const next = parseWorkspaceFile(await file.text());
                      if (!next) {
                        flashMsg("That file is not a LedgerSync workspace.");
                        return;
                      }
                      replaceWorkspace(next);
                      flashMsg(`Imported ${next.runs.length} runs from ${file.name}.`);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importRef.current?.click()}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    IMPORT WORKSPACE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetDemo();
                      flashMsg("Restored the sample runs, rules, and settings.");
                    }}
                    className="font-mono text-[11px] text-[var(--muted-foreground)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--secondary)] transition-colors"
                  >
                    RESTORE SAMPLE DATA
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── DATA SOURCES ── */}
          {tab === "DATA SOURCES" && (
            <>
              <SectionHeader title="Data Source Configuration" description="Connect ledger and settlement file sources for automated ingestion." />
              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Ledger Source</div>
                </div>
                <FormRow label="Connection Type">
                  <SelectInput value={draft.ledgerType} onChange={set("ledgerType")}>
                    <option value="sftp">SFTP</option>
                    <option value="s3">AWS S3</option>
                    <option value="azure_blob">Azure Blob Storage</option>
                    <option value="api">REST API</option>
                    <option value="manual">Manual Upload</option>
                  </SelectInput>
                </FormRow>
                {draft.ledgerType === "sftp" && (
                  <>
                    <FormRow label="Host">
                      <TextInput value={draft.ledgerHost} onChange={set("ledgerHost")} placeholder="sftp.host.internal" />
                    </FormRow>
                    <FormRow label="Remote Path" note="Glob patterns supported">
                      <TextInput value={draft.ledgerPath} onChange={set("ledgerPath")} placeholder="/exports/**/*.csv" />
                    </FormRow>
                    <FormRow label="Username">
                      <TextInput value={draft.ledgerUser} onChange={set("ledgerUser")} />
                    </FormRow>
                    <FormRow label="Private Key" note="PEM-encoded RSA or Ed25519 key">
                      <input
                        ref={keyInputRef}
                        type="file"
                        accept=".pem,.pub,.key,.txt"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setKeyFileName(file.name);
                          flashMsg(`Key file ${file.name} stored in this browser session only.`);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => keyInputRef.current?.click()}
                        className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                      >
                        UPLOAD KEY FILE
                      </button>
                      {keyFileName && (
                        <span className="font-mono text-[11px] text-[var(--status-match)] ml-3">✓ {keyFileName}</span>
                      )}
                    </FormRow>
                  </>
                )}
                <FormRow label="Date Format">
                  <SelectInput value={draft.dateFormat} onChange={set("dateFormat")}>
                    {["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "YYYYMMDD"].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => testConnection("ledger")}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    {testing === "ledger" ? "CHECKING…" : "TEST CONNECTION"}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Settlement Source</div>
                </div>
                <FormRow label="Protocol">
                  <SelectInput value={draft.stlmtType} onChange={set("stlmtType")}>
                    <option value="nibss">NIBSS EFT / NIP</option>
                    <option value="swift">SWIFT MT940 / MT942</option>
                    <option value="camt">CAMT.053 (ISO 20022)</option>
                    <option value="bai2">BAI2</option>
                    <option value="sftp">SFTP File</option>
                    <option value="api">REST API</option>
                  </SelectInput>
                </FormRow>
                {draft.stlmtType === "nibss" && (
                  <>
                    <FormRow label="Bank BIC / SWIFT" note="CBN-assigned NIBSS participant code">
                      <TextInput value={draft.swiftBic} onChange={set("swiftBic")} placeholder="MRDNNGLA" />
                    </FormRow>
                    <FormRow label="Inbound Queue">
                      <TextInput value={draft.swiftQueue} onChange={set("swiftQueue")} placeholder="NIBSS_NIP_INBOUND" />
                    </FormRow>
                  </>
                )}
                {draft.stlmtType === "swift" && (
                  <>
                    <FormRow label="BIC Code">
                      <TextInput value={draft.swiftBic} onChange={set("swiftBic")} placeholder="BANKNGLA" />
                    </FormRow>
                    <FormRow label="Message Queue">
                      <TextInput value={draft.swiftQueue} onChange={set("swiftQueue")} placeholder="MT940_INBOUND" />
                    </FormRow>
                  </>
                )}
                <div className="py-3">
                  <button
                    type="button"
                    onClick={() => testConnection("settlement")}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    {testing === "settlement" ? "CHECKING…" : "TEST CONNECTION"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === "NOTIFICATIONS" && (
            <>
              <SectionHeader title="Notifications" description="Configure alerts for reconciliation events and exception thresholds." />
              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Trigger Events</div>
                  <div className="space-y-3">
                    <Toggle checked={draft.notifyOnComplete} onChange={set("notifyOnComplete")} label="Run completed" description="Send notification when a reconciliation run finishes." />
                    <Toggle checked={draft.notifyOnMismatch} onChange={set("notifyOnMismatch")} label="Mismatch threshold exceeded" description="Alert when mismatch count exceeds the configured threshold." />
                    <Toggle checked={draft.notifyOnMissing} onChange={set("notifyOnMissing")} label="Missing entries detected" description="Alert when settlement or ledger entries are absent." />
                    <Toggle checked={draft.notifyOnFailure} onChange={set("notifyOnFailure")} label="Run failure" description="Alert immediately if a reconciliation run errors out." />
                  </div>
                </div>
                <FormRow label="Mismatch Alert Threshold" note="Alert when mismatch count ≥ this value">
                  <TextInput value={draft.mismatchThreshold} onChange={set("mismatchThreshold")} type="number" placeholder="5" />
                </FormRow>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Delivery Channels</div>
                </div>
                <FormRow label="Email Recipients" note="Comma-separated addresses">
                  <TextInput value={draft.emailRecipients} onChange={set("emailRecipients")} placeholder="user@company.com, user2@company.com" />
                </FormRow>
                <FormRow label="Slack Webhook URL">
                  <TextInput value={draft.slackWebhook} onChange={set("slackWebhook")} placeholder="https://hooks.slack.com/services/..." />
                </FormRow>
                <FormRow label="PagerDuty Integration Key" note="Routing key for critical failures only">
                  <TextInput value={draft.pagerdutyKey} onChange={set("pagerdutyKey")} placeholder="••••••••••••••••••••••••••••••••" type="password" />
                </FormRow>
              </div>
            </>
          )}

          {/* ── SECURITY ── */}
          {tab === "SECURITY" && (
            <>
              <SectionHeader title="Security & Access" description="Authentication, SSO, and session policies." />
              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Authentication</div>
                  <div className="space-y-3">
                    <Toggle checked={draft.mfaRequired} onChange={set("mfaRequired")} label="Require MFA for all users" description="Enforce TOTP or hardware key for every login." />
                    <Toggle checked={draft.ssoEnabled} onChange={set("ssoEnabled")} label="Enable SSO" description="Delegate authentication to your identity provider." />
                  </div>
                </div>
                {draft.ssoEnabled && (
                  <FormRow label="SSO Provider">
                    <SelectInput value={draft.ssoProvider} onChange={set("ssoProvider")}>
                      <option value="okta">Okta</option>
                      <option value="azure_ad">Microsoft Entra ID</option>
                      <option value="google">Google Workspace</option>
                      <option value="pingidentity">Ping Identity</option>
                      <option value="saml">Generic SAML 2.0</option>
                    </SelectInput>
                  </FormRow>
                )}
                <FormRow label="Session Timeout" note="Idle minutes before forced logout">
                  <div className="flex items-center gap-2">
                    <TextInput value={draft.sessionTimeout} onChange={set("sessionTimeout")} type="number" />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">minutes</span>
                  </div>
                </FormRow>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <FormRow label="IP Allowlist" note="CIDR ranges, comma-separated. Leave blank to allow all.">
                  <TextInput value={draft.ipAllowlist} onChange={set("ipAllowlist")} placeholder="10.0.0.0/8, 203.0.113.0/24" />
                </FormRow>
                <FormRow label="Audit Log Retention">
                  <div className="flex items-center gap-2">
                    <TextInput value={draft.auditLogRetention} onChange={set("auditLogRetention")} type="number" />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">days</span>
                  </div>
                </FormRow>
              </div>
            </>
          )}

          {/* ── API ── */}
          {tab === "API" && (
            <>
              <SectionHeader title="API & Webhooks" description="Programmatic access and outbound event hooks." />
              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-3">REST API Access</div>
                  <Toggle checked={draft.apiEnabled} onChange={set("apiEnabled")} label="Enable REST API" description="Allow external systems to query reconciliation data and trigger runs." />
                </div>
                {draft.apiEnabled && (
                  <>
                    <FormRow label="API Key" note="Read-only. Regenerate to rotate.">
                      <div className="flex items-center gap-2">
                        <TextInput value={apiKey} readOnly />
                        <button type="button" onClick={rotateApiKey} className="font-mono text-[11px] text-[var(--status-warning)] border border-[var(--status-warning)]/30 px-3 py-2 hover:bg-[var(--status-warning)]/10 transition-colors shrink-0">ROTATE</button>
                      </div>
                    </FormRow>
                    <FormRow label="Rate Limit" note="Requests per minute per key">
                      <TextInput value={draft.rateLimit} onChange={set("rateLimit")} type="number" />
                    </FormRow>
                    <FormRow label="API Base URL" note="Read-only">
                      <TextInput value="https://api.ledgersync.io/v1" readOnly />
                    </FormRow>
                  </>
                )}
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Webhook</div>
                </div>
                <FormRow label="Endpoint URL" note="POST events sent on run complete, mismatch, failure">
                  <TextInput value={draft.webhookUrl} onChange={set("webhookUrl")} placeholder="https://your-api.com/webhook" />
                </FormRow>
                <FormRow label="Signing Secret" note="Used to verify webhook authenticity (HMAC-SHA256)">
                  <div className="flex items-center gap-2">
                    <TextInput value={webhookSecret} readOnly />
                    <button type="button" onClick={rotateWebhookSecret} className="font-mono text-[11px] text-[var(--status-warning)] border border-[var(--status-warning)]/30 px-3 py-2 hover:bg-[var(--status-warning)]/10 transition-colors shrink-0">ROTATE</button>
                  </div>
                </FormRow>
                <div className="py-3">
                  <button
                    type="button"
                    onClick={sendTestPayload}
                    className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    {testing === "webhook" ? "SENDING…" : "SEND TEST PAYLOAD"}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} saved={saved} />
    </div>
  );
}
