import { useState } from "react";
import FormRow from "../components/FormRow";
import TextInput from "../components/TextInput";
import SelectInput from "../components/SelectInput";
import Toggle from "../components/Toggle";

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

const TABS = ["GENERAL", "DATA SOURCES", "NOTIFICATIONS", "SECURITY", "API"] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("GENERAL");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  function mark() { setDirty(true); setSaved(false); }
  function save() { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  function discard() { setDirty(false); }

  // General
  const [orgName, setOrgName] = useState("Meridian Capital & Trust Nigeria Ltd");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [currency, setCurrency] = useState("NGN");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12-31");
  const [retentionDays, setRetentionDays] = useState("90");
  const [autoRun, setAutoRun] = useState(true);
  const [autoRunTime, setAutoRunTime] = useState("17:00");
  const [breakThreshold, setBreakThreshold] = useState("100");

  // Data sources
  const [ledgerType, setLedgerType] = useState("sftp");
  const [ledgerHost, setLedgerHost] = useState("sftp.meridian-ledger.ng");
  const [ledgerPath, setLedgerPath] = useState("/exports/ledger/daily/*.csv");
  const [ledgerUser, setLedgerUser] = useState("recon_svc");
  const [stlmtType, setStlmtType] = useState("nibss");
  const [swiftBic, setSwiftBic] = useState("MRDNNGLA");
  const [swiftQueue, setSwiftQueue] = useState("NIBSS_NIP_INBOUND");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  // Notifications
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnMismatch, setNotifyOnMismatch] = useState(true);
  const [notifyOnMissing, setNotifyOnMissing] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [mismatchThreshold, setMismatchThreshold] = useState("5");
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/T00000/B00000/XXXXXXX");
  const [emailRecipients, setEmailRecipients] = useState("controller@meridian.ng, cfo@meridian.ng");
  const [pagerdutyKey, setPagerdutyKey] = useState("");

  // Security
  const [mfaRequired, setMfaRequired] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [ssoProvider, setSsoProvider] = useState("okta");
  const [sessionTimeout, setSessionTimeout] = useState("480");
  const [ipAllowlist, setIpAllowlist] = useState("10.0.0.0/8, 172.16.0.0/12");
  const [auditLogRetention, setAuditLogRetention] = useState("365");

  // API
  const [apiEnabled, setApiEnabled] = useState(true);
  const [rateLimit, setRateLimit] = useState("1000");
  const [webhookUrl, setWebhookUrl] = useState("https://api.meridian.ng/ledgersync/webhook");
  const [webhookSecret, setWebhookSecret] = useState("wh_sec_••••••••••••••••");

  function w<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); mark(); };
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* sub-nav */}
      <div className="flex items-center gap-0 px-3 sm:px-5 border-b border-[var(--border)] bg-[var(--card)] h-9 shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
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
                  <TextInput value={orgName} onChange={w(setOrgName)} placeholder="Your organization" />
                </FormRow>
                <FormRow label="Default Timezone">
                  <SelectInput value={timezone} onChange={w(setTimezone)}>
                    {["Africa/Lagos", "UTC", "America/New_York", "Europe/London", "Europe/Frankfurt", "Asia/Dubai", "Asia/Singapore"].map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Base Currency">
                  <SelectInput value={currency} onChange={w(setCurrency)}>
                    {["NGN", "USD", "EUR", "GBP", "GHS", "ZAR", "KES", "XOF"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <FormRow label="Fiscal Year End" note="MM-DD format">
                  <TextInput value={fiscalYearEnd} onChange={w(setFiscalYearEnd)} placeholder="12-31" />
                </FormRow>
                <FormRow label="Report Retention" note="Days to keep generated reports">
                  <div className="flex items-center gap-2">
                    <TextInput value={retentionDays} onChange={w(setRetentionDays)} type="number" />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">days</span>
                  </div>
                </FormRow>
              </div>

              <div className="mt-4 bg-[var(--card)] border border-[var(--border)] px-5">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest mb-3">Automated Reconciliation</div>
                  <Toggle
                    checked={autoRun}
                    onChange={w(setAutoRun)}
                    label="Enable daily auto-run"
                    description="Automatically trigger reconciliation at the scheduled time each business day."
                  />
                </div>
                {autoRun && (
                  <FormRow label="Run Time (UTC)">
                    <TextInput type="time" value={autoRunTime} onChange={w(setAutoRunTime)} />
                  </FormRow>
                )}
                <FormRow label="Break Amount Threshold" note="Minimum delta to flag as mismatch">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">$</span>
                    <TextInput value={breakThreshold} onChange={w(setBreakThreshold)} type="number" placeholder="0.01" />
                  </div>
                </FormRow>
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
                  <SelectInput value={ledgerType} onChange={w(setLedgerType)}>
                    <option value="sftp">SFTP</option>
                    <option value="s3">AWS S3</option>
                    <option value="azure_blob">Azure Blob Storage</option>
                    <option value="api">REST API</option>
                    <option value="manual">Manual Upload</option>
                  </SelectInput>
                </FormRow>
                {ledgerType === "sftp" && (
                  <>
                    <FormRow label="Host">
                      <TextInput value={ledgerHost} onChange={w(setLedgerHost)} placeholder="sftp.host.internal" />
                    </FormRow>
                    <FormRow label="Remote Path" note="Glob patterns supported">
                      <TextInput value={ledgerPath} onChange={w(setLedgerPath)} placeholder="/exports/**/*.csv" />
                    </FormRow>
                    <FormRow label="Username">
                      <TextInput value={ledgerUser} onChange={w(setLedgerUser)} />
                    </FormRow>
                    <FormRow label="Private Key" note="PEM-encoded RSA or Ed25519 key">
                      <button className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors">
                        UPLOAD KEY FILE
                      </button>
                      <span className="font-mono text-[11px] text-[var(--status-match)] ml-3">✓ ed25519_recon.pub uploaded</span>
                    </FormRow>
                  </>
                )}
                <FormRow label="Date Format">
                  <SelectInput value={dateFormat} onChange={w(setDateFormat)}>
                    {["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "YYYYMMDD"].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </SelectInput>
                </FormRow>
                <div className="py-3">
                  <button className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors">
                    TEST CONNECTION
                  </button>
                </div>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Settlement Source</div>
                </div>
                <FormRow label="Protocol">
                  <SelectInput value={stlmtType} onChange={w(setStlmtType)}>
                    <option value="nibss">NIBSS EFT / NIP</option>
                    <option value="swift">SWIFT MT940 / MT942</option>
                    <option value="camt">CAMT.053 (ISO 20022)</option>
                    <option value="bai2">BAI2</option>
                    <option value="sftp">SFTP File</option>
                    <option value="api">REST API</option>
                  </SelectInput>
                </FormRow>
                {stlmtType === "nibss" && (
                  <>
                    <FormRow label="Bank BIC / SWIFT" note="CBN-assigned NIBSS participant code">
                      <TextInput value={swiftBic} onChange={w(setSwiftBic)} placeholder="MRDNNGLA" />
                    </FormRow>
                    <FormRow label="Inbound Queue">
                      <TextInput value={swiftQueue} onChange={w(setSwiftQueue)} placeholder="NIBSS_NIP_INBOUND" />
                    </FormRow>
                  </>
                )}
                {stlmtType === "swift" && (
                  <>
                    <FormRow label="BIC Code">
                      <TextInput value={swiftBic} onChange={w(setSwiftBic)} placeholder="BANKNGLA" />
                    </FormRow>
                    <FormRow label="Message Queue">
                      <TextInput value={swiftQueue} onChange={w(setSwiftQueue)} placeholder="MT940_INBOUND" />
                    </FormRow>
                  </>
                )}
                <div className="py-3">
                  <button className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors">
                    TEST CONNECTION
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
                    <Toggle checked={notifyOnComplete} onChange={w(setNotifyOnComplete)} label="Run completed" description="Send notification when a reconciliation run finishes." />
                    <Toggle checked={notifyOnMismatch} onChange={w(setNotifyOnMismatch)} label="Mismatch threshold exceeded" description="Alert when mismatch count exceeds the configured threshold." />
                    <Toggle checked={notifyOnMissing} onChange={w(setNotifyOnMissing)} label="Missing entries detected" description="Alert when settlement or ledger entries are absent." />
                    <Toggle checked={notifyOnFailure} onChange={w(setNotifyOnFailure)} label="Run failure" description="Alert immediately if a reconciliation run errors out." />
                  </div>
                </div>
                <FormRow label="Mismatch Alert Threshold" note="Alert when mismatch count ≥ this value">
                  <TextInput value={mismatchThreshold} onChange={w(setMismatchThreshold)} type="number" placeholder="5" />
                </FormRow>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5 mb-4">
                <div className="py-3 border-b border-[var(--border)]">
                  <div className="font-mono text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Delivery Channels</div>
                </div>
                <FormRow label="Email Recipients" note="Comma-separated addresses">
                  <TextInput value={emailRecipients} onChange={w(setEmailRecipients)} placeholder="user@company.com, user2@company.com" />
                </FormRow>
                <FormRow label="Slack Webhook URL">
                  <TextInput value={slackWebhook} onChange={w(setSlackWebhook)} placeholder="https://hooks.slack.com/services/..." />
                </FormRow>
                <FormRow label="PagerDuty Integration Key" note="Routing key for critical failures only">
                  <TextInput value={pagerdutyKey} onChange={w(setPagerdutyKey)} placeholder="••••••••••••••••••••••••••••••••" type="password" />
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
                    <Toggle checked={mfaRequired} onChange={w(setMfaRequired)} label="Require MFA for all users" description="Enforce TOTP or hardware key for every login." />
                    <Toggle checked={ssoEnabled} onChange={w(setSsoEnabled)} label="Enable SSO" description="Delegate authentication to your identity provider." />
                  </div>
                </div>
                {ssoEnabled && (
                  <FormRow label="SSO Provider">
                    <SelectInput value={ssoProvider} onChange={w(setSsoProvider)}>
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
                    <TextInput value={sessionTimeout} onChange={w(setSessionTimeout)} type="number" />
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)] shrink-0">minutes</span>
                  </div>
                </FormRow>
              </div>

              <div className="bg-[var(--card)] border border-[var(--border)] px-5">
                <FormRow label="IP Allowlist" note="CIDR ranges, comma-separated. Leave blank to allow all.">
                  <TextInput value={ipAllowlist} onChange={w(setIpAllowlist)} placeholder="10.0.0.0/8, 203.0.113.0/24" />
                </FormRow>
                <FormRow label="Audit Log Retention">
                  <div className="flex items-center gap-2">
                    <TextInput value={auditLogRetention} onChange={w(setAuditLogRetention)} type="number" />
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
                  <Toggle checked={apiEnabled} onChange={w(setApiEnabled)} label="Enable REST API" description="Allow external systems to query reconciliation data and trigger runs." />
                </div>
                {apiEnabled && (
                  <>
                    <FormRow label="API Key" note="Read-only. Regenerate to rotate.">
                      <div className="flex items-center gap-2">
                        <TextInput value="lsk_live_••••••••••••••••••••••••••••••••" readOnly />
                        <button className="font-mono text-[11px] text-[var(--status-warning)] border border-[var(--status-warning)]/30 px-3 py-2 hover:bg-[var(--status-warning)]/10 transition-colors shrink-0">ROTATE</button>
                      </div>
                    </FormRow>
                    <FormRow label="Rate Limit" note="Requests per minute per key">
                      <TextInput value={rateLimit} onChange={w(setRateLimit)} type="number" />
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
                  <TextInput value={webhookUrl} onChange={w(setWebhookUrl)} placeholder="https://your-api.com/webhook" />
                </FormRow>
                <FormRow label="Signing Secret" note="Used to verify webhook authenticity (HMAC-SHA256)">
                  <div className="flex items-center gap-2">
                    <TextInput value={webhookSecret} readOnly />
                    <button className="font-mono text-[11px] text-[var(--status-warning)] border border-[var(--status-warning)]/30 px-3 py-2 hover:bg-[var(--status-warning)]/10 transition-colors shrink-0">ROTATE</button>
                  </div>
                </FormRow>
                <div className="py-3">
                  <button className="font-mono text-[11px] text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-2 hover:bg-[var(--primary)]/10 transition-colors">
                    SEND TEST PAYLOAD
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
