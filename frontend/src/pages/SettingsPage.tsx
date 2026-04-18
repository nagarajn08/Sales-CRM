import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { settingsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { capitalizeName } from "../lib/validators";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useTheme, type ThemeColor } from "../hooks/useTheme";
import { cn } from "../lib/utils";

const THEMES: { value: ThemeColor; label: string; color: string }[] = [
  { value: "blue",   label: "Blue",   color: "bg-blue-500" },
  { value: "indigo", label: "Indigo", color: "bg-indigo-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "pink",   label: "Pink",   color: "bg-pink-500" },
  { value: "red",    label: "Red",    color: "bg-red-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-500" },
  { value: "green",  label: "Green",  color: "bg-green-500" },
  { value: "teal",   label: "Teal",   color: "bg-teal-500" },
  { value: "cyan",   label: "Cyan",   color: "bg-cyan-500" },
  { value: "sky",    label: "Sky Blue", color: "bg-sky-500" },
  { value: "grey",   label: "Grey",   color: "bg-slate-500" },
];

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
            <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        }
        title="Appearance"
        description="Theme color and display mode"
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Accent Color</p>
            <div className="flex gap-2 flex-wrap">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme({ color: t.value })}
                  title={t.label}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-medium",
                    theme.color === t.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className={cn("h-3 w-3 rounded-full shrink-0", t.color)} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Mode</p>
            <div className="flex gap-2">
              {[
                { dark: false, label: "Light", icon: "☀️" },
                { dark: true,  label: "Dark",  icon: "🌙" },
              ].map((m) => (
                <button
                  key={String(m.dark)}
                  onClick={() => setTheme({ dark: m.dark })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                    theme.dark === m.dark
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {m.icon} {m.label}
                </button>
              ))}
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
              placeholder="SalesCRM <noreply@yourcompany.com>"
            />
            <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
              <Button
                variant="outline"
                size="sm"
                loading={testingSmtp}
                onClick={async () => {
                  setTestingSmtp(true);
                  try {
                    const r = await settingsApi.testSmtp();
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
          title="WhatsApp / SMS"
          description="Send reminders via Twilio (WhatsApp or SMS)"
        >
          <div className="space-y-3">
            <Input
              label="Twilio Account SID"
              value={settings.twilio_account_sid ?? ""}
              onChange={(e) => set("twilio_account_sid", e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <Input
              label="Twilio Auth Token"
              type="password"
              value={settings.twilio_auth_token ?? ""}
              onChange={(e) => set("twilio_auth_token", e.target.value)}
            />
            <Input
              label="From Number"
              value={settings.twilio_from_number ?? ""}
              onChange={(e) => set("twilio_from_number", e.target.value)}
              placeholder="whatsapp:+14155238886  or  +91XXXXXXXXXX"
              helpText="Use 'whatsapp:+number' for WhatsApp, or '+number' for SMS"
            />
            <SaveRow
              saving={savingWa}
              saved={savedWa}
              savedMsg="WhatsApp settings saved!"
              onSave={() => saveSection(
                ["twilio_account_sid", "twilio_auth_token", "twilio_from_number"],
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
                { platform: "Meta (Facebook/Instagram)", desc: "Use Webhook URL above. Verify token: salescrm_webhook_verify" },
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
    </div>
  );
}
