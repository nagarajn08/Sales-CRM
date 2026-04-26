import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { leadsApi, settingsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { capitalizeName } from "../lib/validators";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useTheme, themeHex, FONT_OPTIONS, type ThemeMode } from "../hooks/useTheme";
import { cn } from "../lib/utils";

// Mini app preview used inside mode-selection cards
function MiniPreview({ dark, accent }: { dark: boolean; accent: string }) {
  const bg      = dark ? "#1a1b2e" : "#f5f4f0";
  const sidebar  = dark ? "#0f1021" : "#ffffff";
  const line1   = dark ? "#2e3048" : "#e8e4de";
  const line2   = dark ? "#252740" : "#ede9e3";
  const textClr = dark ? "#4a4f72" : "#c9c3bb";
  return (
    <svg viewBox="0 0 88 52" className="w-full h-full" style={{ display: "block" }}>
      {/* sidebar */}
      <rect x="0"  y="0" width="22" height="52" fill={sidebar} rx="0"/>
      {/* content */}
      <rect x="22" y="0" width="66" height="52" fill={bg}/>
      {/* sidebar dots */}
      <circle cx="8"  cy="12" r="2.5" fill={textClr}/>
      <circle cx="8"  cy="22" r="2.5" fill={textClr}/>
      <circle cx="8"  cy="32" r="2.5" fill={accent} opacity="0.9"/>
      <rect x="13" y="10.5" width="6" height="3" rx="1" fill={textClr}/>
      <rect x="13" y="20.5" width="6" height="3" rx="1" fill={textClr}/>
      <rect x="13" y="30.5" width="6" height="3" rx="1" fill={accent} opacity="0.9"/>
      {/* content lines */}
      <rect x="27" y="12" width="32" height="3.5" rx="1.5" fill={line1}/>
      <rect x="27" y="20" width="22" height="3"   rx="1.5" fill={line2}/>
      <rect x="27" y="28" width="27" height="3"   rx="1.5" fill={line2}/>
      <rect x="27" y="36" width="18" height="3"   rx="1.5" fill={line2}/>
      {/* accent button */}
      <rect x="60" y="40" width="20" height="8" rx="3" fill={accent} opacity="0.9"/>
    </svg>
  );
}

function ModeCard({ mode, current, accent, onSelect }: {
  mode: ThemeMode; current: ThemeMode; accent: string; onSelect: () => void;
}) {
  const selected = mode === current;
  const label = mode === "system" ? "Device Default" : mode === "light" ? "Light" : "Dark";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex-1 flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-secondary/30"
      )}
    >
      <div className="w-full rounded-lg overflow-hidden" style={{ height: 56 }}>
        {mode === "system" ? (
          <div className="relative w-full h-full">
            <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)" }}>
              <MiniPreview dark={false} accent={accent} />
            </div>
            <div className="absolute inset-0" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)" }}>
              <MiniPreview dark={true} accent={accent} />
            </div>
            {/* diagonal divider */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 48%, #888 49%, #888 51%, transparent 52%)", opacity: 0.2 }} />
          </div>
        ) : (
          <MiniPreview dark={mode === "dark"} accent={accent} />
        )}
      </div>
      <span className={cn("text-[11px] font-medium", selected ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

function SectionCard({
  icon,
  iconBg,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-secondary/30">
        <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl shrink-0", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SaveRow({ saving, saved, savedMsg = "Saved!", onSave }: { saving: boolean; saved: boolean; savedMsg?: string; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
      <span className={cn("text-xs font-medium transition-opacity", saved ? "text-green-600 opacity-100" : "opacity-0")}>
        ✓ {savedMsg}
      </span>
      <Button onClick={onSave} loading={saving} size="sm">Save</Button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme(user?.id);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Color picker state
  const colorInputRef = useRef<HTMLInputElement>(null);
  const currentHex = themeHex(theme);
  const [hexInput, setHexInput] = useState(currentHex);
  useEffect(() => { setHexInput(themeHex(theme)); }, [theme.color, theme.customHex]);

  const applyHex = (hex: string) => {
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    if (/^#[0-9a-f]{6}$/i.test(normalized)) {
      setTheme({ color: "custom", customHex: normalized });
    }
  };

  // Per-section save state
  const [savingEmail, setSavingEmail] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [savedWa, setSavedWa] = useState(false);

  // Org name
  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [savedOrg, setSavedOrg] = useState(false);
  const [orgError, setOrgError] = useState("");

  // Webhook
  const [webhook, setWebhook] = useState<{ webhook_url: string; verify_token: string } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Auto-assign
  const [savingAutoAssign, setSavingAutoAssign] = useState(false);
  const [savedAutoAssign, setSavedAutoAssign] = useState(false);
  const [runningAutoAssign, setRunningAutoAssign] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<{ assigned: number; details: { user: string; assigned: number }[] } | null>(null);

  useEffect(() => {
    settingsApi.get().then(setSettings).finally(() => setLoading(false));
    settingsApi.getWebhook().then(setWebhook).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.org_name) setOrgName(user.org_name);
  }, [user?.org_name]);

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const saveSection = async (
    keys: string[],
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
  ) => {
    setSaving(true);
    setSaved(false);
    const partial = Object.fromEntries(keys.map((k) => [k, settings[k] ?? ""]));
    try {
      await settingsApi.update(partial);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const saveOrgName = async () => {
    if (!orgName.trim()) { setOrgError("Organization name cannot be empty"); return; }
    setOrgError("");
    setSavingOrg(true);
    setSavedOrg(false);
    try {
      await settingsApi.updateOrgName(orgName.trim());
      await refreshUser();
      setSavedOrg(true);
      setTimeout(() => setSavedOrg(false), 3000);
    } catch {
      setOrgError("Failed to update organization name");
    } finally {
      setSavingOrg(false);
    }
  };

  const copyWebhook = () => {
    if (webhook?.webhook_url) {
      navigator.clipboard.writeText(webhook.webhook_url);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    }
  };

  const regenerateWebhook = async () => {
    setRegenerating(true);
    try {
      const data = await settingsApi.regenerateWebhook();
      setWebhook(prev => prev ? { ...prev, ...data } : null);
    } finally {
      setRegenerating(false);
    }
  };

  const runAutoAssign = async () => {
    setRunningAutoAssign(true);
    setAutoAssignResult(null);
    try {
      const result = await leadsApi.autoAssign();
      setAutoAssignResult(result);
      toast.success(`Auto-assigned ${result.assigned} lead${result.assigned !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Auto-assign failed");
    } finally {
      setRunningAutoAssign(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace configuration</p>
      </div>

      {/* ── Appearance ── */}
      <SectionCard
        iconBg="bg-violet-500/15"
        icon={
          <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-violet-500">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M6 10c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
          </svg>
        }
        title="Appearance"
        description="Accent color and display mode"
      >
        <div className="space-y-6">

          {/* App Color */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">App Color</p>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-secondary/30">
              {/* Color swatch — click to open picker */}
              <button
                onClick={() => colorInputRef.current?.click()}
                className="h-10 w-10 rounded-full shrink-0 ring-2 ring-border hover:ring-primary/50 transition-all"
                style={{ backgroundColor: currentHex }}
                title="Pick color"
              />
              {/* Hidden native color input */}
              <input
                ref={colorInputRef}
                type="color"
                value={currentHex}
                onChange={(e) => { setHexInput(e.target.value); applyHex(e.target.value); }}
                className="sr-only"
              />
              {/* Hex input */}
              <div className="flex items-center gap-1.5 flex-1 bg-background border border-border rounded-xl px-3 py-2">
                <span className="text-muted-foreground text-sm font-mono">#</span>
                <input
                  type="text"
                  maxLength={6}
                  value={hexInput.replace(/^#/, "")}
                  onChange={(e) => setHexInput("#" + e.target.value.replace(/[^0-9a-f]/gi, ""))}
                  onBlur={(e) => applyHex("#" + e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyHex(hexInput)}
                  placeholder="6366f1"
                  className="flex-1 bg-transparent text-foreground text-sm font-mono tracking-widest outline-none uppercase"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Customize the app's accent color. Click the swatch or type a hex value.
            </p>
          </div>

          {/* Background Color */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Background Color</p>
            <div className="flex gap-3">
              {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
                <ModeCard
                  key={m}
                  mode={m}
                  current={theme.mode}
                  accent={currentHex}
                  onSelect={() => setTheme({ mode: m })}
                />
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Font</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((f) => {
                const selected = (theme.font ?? "dm-sans") === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setTheme({ font: f.value })}
                    className={cn(
                      "flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/30 hover:border-primary/40"
                    )}
                  >
                    <span
                      className={cn("text-base font-semibold leading-none mb-1", selected ? "text-primary" : "text-foreground")}
                      style={{ fontFamily: f.family }}
                    >
                      Aa
                    </span>
                    <span className={cn("text-[11px] font-medium", selected ? "text-primary" : "text-muted-foreground")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </SectionCard>

      {/* ── Organization ── */}
      <SectionCard
        iconBg="bg-blue-500/15"
        icon={
          <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-blue-500">
            <rect x="3" y="7" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M7 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        }
        title="Organization"
        description="Your workspace identity"
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(capitalizeName(e.target.value))}
            placeholder="Acme Corporation"
            helpText="Shown in the sidebar and used to identify your workspace"
            error={orgError}
          />
          <SaveRow saving={savingOrg} saved={savedOrg} savedMsg="Name updated!" onSave={saveOrgName} />
        </div>
      </SectionCard>

      {/* ── Email Settings ── */}
      {!loading && (
        <SectionCard
          iconBg="bg-emerald-500/15"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-emerald-500">
              <rect x="2" y="5" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          title="Email (SMTP)"
          description="Configure outgoing email for OTPs and notifications"
        >
          <div className="space-y-3">
            <Input
              label="Support Email"
              type="email"
              value={settings.support_email ?? ""}
              onChange={(e) => set("support_email", e.target.value)}
              placeholder="support@yourcompany.com"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="SMTP Host"
                value={settings.smtp_host ?? ""}
                onChange={(e) => set("smtp_host", e.target.value)}
                placeholder="smtp.gmail.com"
              />
              <Input
                label="SMTP Port"
                type="number"
                value={settings.smtp_port ?? "587"}
                onChange={(e) => set("smtp_port", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="SMTP Username"
                value={settings.smtp_user ?? ""}
                onChange={(e) => set("smtp_user", e.target.value)}
                placeholder="your@email.com"
              />
              <Input
                label="SMTP Password"
                type="password"
                value={settings.smtp_password ?? ""}
                onChange={(e) => set("smtp_password", e.target.value)}
              />
            </div>
            <Input
              label="From (sender name)"
              value={settings.smtp_from ?? ""}
              onChange={(e) => set("smtp_from", e.target.value)}
              placeholder="TrackmyLead <noreply@trackmylead.in>"
            />
            <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
              <Button
                variant="outline"
                size="sm"
                loading={testingSmtp}
                onClick={async () => {
                  setTestingSmtp(true);
                  try {
                    const r = await settingsApi.testSmtp({
                      smtp_host: settings.smtp_host ?? "",
                      smtp_port: settings.smtp_port ?? "587",
                      smtp_user: settings.smtp_user ?? "",
                      smtp_password: settings.smtp_password ?? "",
                    });
                    toast.success(r.detail);
                  } catch {
                    // error toast shown by global interceptor
                  } finally {
                    setTestingSmtp(false);
                  }
                }}
              >
                Test Connection
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  loading={savingEmail}
                  size="sm"
                  onClick={() => saveSection(
                    ["support_email", "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"],
                    setSavingEmail, setSavedEmail,
                  )}
                >
                  Save
                </Button>
                {savedEmail && <span className="text-xs font-medium text-green-600">✓ Email settings saved!</span>}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── WhatsApp / SMS ── */}
      {!loading && (
        <SectionCard
          iconBg="bg-green-500/15"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-green-600">
              <path d="M10 2a8 8 0 018 8 8 8 0 01-8 8 7.96 7.96 0 01-4.2-1.2L2 18l1.2-3.8A7.96 7.96 0 012 10a8 8 0 018-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M7.5 8c0-.28.22-.5.5-.5h.5a.5.5 0 01.5.5v.5c0 .83-.5 1.5-1 2l1.5 1.5c.5-.5 1.17-1 2-1h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5C10 13 7 10 7.5 8z" fill="currentColor"/>
            </svg>
          }
          title="WhatsApp Reminders"
          description="Send follow-up reminders via Fast2SMS WhatsApp"
        >
          <div className="space-y-3">
            <Input
              label="Fast2SMS API Key"
              type="password"
              value={settings.fast2sms_api_key ?? ""}
              onChange={(e) => set("fast2sms_api_key", e.target.value)}
              placeholder="Your Fast2SMS API key"
              helpText="Get your API key from fast2sms.com — used for WhatsApp follow-up reminders"
            />
            <SaveRow
              saving={savingWa}
              saved={savedWa}
              savedMsg="WhatsApp settings saved!"
              onSave={() => saveSection(
                ["fast2sms_api_key"],
                setSavingWa, setSavedWa,
              )}
            />
          </div>
        </SectionCard>
      )}

      {/* ── Social Media Lead Capture ── */}
      {webhook && (
        <SectionCard
          iconBg="bg-pink-500/15"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-pink-500">
              <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="5"  cy="10" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7 9l6-3M7 11l6 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          }
          title="Social Media Lead Capture"
          description="Auto-import leads from Meta, LinkedIn, Google Ads"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste this webhook URL into your ad platform to automatically push leads into your CRM.
            </p>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary rounded-lg px-3 py-2.5 text-foreground break-all font-mono">
                  {webhook.webhook_url}
                </code>
                <button
                  onClick={copyWebhook}
                  className="shrink-0 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
                >
                  {webhookCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Meta Verify Token</p>
              <code className="text-xs bg-secondary rounded-lg px-3 py-2 text-foreground font-mono block">
                {webhook.verify_token}
              </code>
            </div>

            <div className="rounded-xl border border-border divide-y divide-border text-sm overflow-hidden">
              {[
                { platform: "Meta (Facebook/Instagram)", desc: "Use Webhook URL above. Verify token: trackmylead_webhook_verify" },
                { platform: "LinkedIn Lead Gen",         desc: "POST to Webhook URL with firstName, lastName, emailAddress fields" },
                { platform: "Google Ads",                desc: "Use webhook integration, POST to Webhook URL" },
                { platform: "Any Platform",              desc: "POST JSON with name, email, mobile, source, campaign_name fields" },
              ].map(({ platform, desc }) => (
                <div key={platform} className="px-4 py-3 hover:bg-secondary/40 transition-colors">
                  <p className="font-medium text-foreground text-xs">{platform}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            {user?.role === "admin" && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Regenerating invalidates the old URL.</p>
                <Button variant="outline" size="sm" onClick={regenerateWebhook} loading={regenerating}>
                  Regenerate URL
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Auto-Assign Leads ── */}
      {user?.role === "admin" && (
        <SectionCard
          iconBg="bg-emerald-500/15"
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5 text-emerald-500">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M2 17c0-3.314 2.686-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M14 12v5M11.5 14.5L14 12l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          title="Auto-Assign Leads"
          description="Automatically distribute unassigned leads to users daily"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
              <div><span className="font-semibold text-foreground">Admin / Manager</span><br/>Up to 10,000 rows per bulk upload</div>
              <div><span className="font-semibold text-foreground">User</span><br/>Up to 1,000 rows per bulk upload</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Leads per user per run
              </label>
              <Input
                type="number"
                min={0}
                max={500}
                value={settings.auto_assign_daily_limit ?? "0"}
                onChange={(e) => set("auto_assign_daily_limit", e.target.value)}
                placeholder="0 = disabled"
                className="w-40"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Set to 0 to disable auto-assign.</p>
            </div>

            <SaveRow
              saving={savingAutoAssign}
              saved={savedAutoAssign}
              onSave={() => saveSection(["auto_assign_daily_limit"], setSavingAutoAssign, setSavedAutoAssign)}
            />

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Distributes unassigned leads equally among active users now.</p>
                <Button size="sm" variant="outline" onClick={runAutoAssign} loading={runningAutoAssign}>
                  Run Now
                </Button>
              </div>
              {autoAssignResult && (
                <div className="mt-3 rounded-xl bg-secondary p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">{autoAssignResult.assigned} lead{autoAssignResult.assigned !== 1 ? "s" : ""} assigned</p>
                  {autoAssignResult.details.map((d) => (
                    <p key={d.user} className="text-muted-foreground">{d.user}: {d.assigned} leads</p>
                  ))}
                  {autoAssignResult.assigned === 0 && (
                    <p className="text-muted-foreground">No unassigned leads found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
