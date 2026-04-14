import { useEffect, useState } from "react";
import { settingsApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useTheme, type ThemeColor } from "../hooks/useTheme";
import { cn } from "../lib/utils";

const THEMES: { value: ThemeColor; label: string; color: string }[] = [
  { value: "blue", label: "Blue", color: "bg-blue-500" },
  { value: "green", label: "Green", color: "bg-green-500" },
  { value: "purple", label: "Purple", color: "bg-purple-500" },
  { value: "orange", label: "Orange", color: "bg-orange-500" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [webhook, setWebhook] = useState<{ webhook_url: string; verify_token: string } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setSettings).finally(() => setLoading(false));
    settingsApi.getWebhook().then(setWebhook).catch(() => {});
  }, []);

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

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await settingsApi.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage application appearance and configuration</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Accent Color</p>
            <div className="flex gap-3 flex-wrap">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme({ color: t.value })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                    theme.color === t.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full", t.color)} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Mode</p>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme({ dark: false })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                  !theme.dark
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setTheme({ dark: true })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
                  theme.dark
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Integration */}
      {webhook && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Media Lead Capture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste this webhook URL into Meta Lead Ads, LinkedIn Lead Gen Forms, or Google Ads
              to automatically push leads into your CRM.
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

            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              {[
                { platform: "Meta (Facebook/Instagram)", desc: "Use Webhook URL above. Verify token: salescrm_webhook_verify" },
                { platform: "LinkedIn Lead Gen", desc: "POST to Webhook URL with firstName, lastName, emailAddress fields" },
                { platform: "Google Ads", desc: "Use webhook integration, POST to Webhook URL" },
                { platform: "Any Platform", desc: "POST JSON with name, email, mobile, source, campaign_name fields" },
              ].map(({ platform, desc }) => (
                <div key={platform} className="px-4 py-3">
                  <p className="font-medium text-foreground">{platform}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            {user?.role === "admin" && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Regenerating creates a new URL and invalidates the old one.</p>
                <Button variant="outline" size="sm" onClick={regenerateWebhook} loading={regenerating}>
                  Regenerate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* App Settings */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Company / App Name"
              value={settings.app_name ?? ""}
              onChange={(e) => updateSetting("app_name", e.target.value)}
              placeholder="SalesCRM"
            />
            <Input
              label="Support Email"
              type="email"
              value={settings.support_email ?? ""}
              onChange={(e) => updateSetting("support_email", e.target.value)}
              placeholder="support@yourcompany.com"
            />
            <Input
              label="Follow-up Reminder (hours before)"
              type="number"
              value={settings.followup_reminder_hours ?? "1"}
              onChange={(e) => updateSetting("followup_reminder_hours", e.target.value)}
              helpText="How many hours before a follow-up to send a reminder notification"
            />
            <Input
              label="SMTP Host"
              value={settings.smtp_host ?? ""}
              onChange={(e) => updateSetting("smtp_host", e.target.value)}
              placeholder="smtp.gmail.com"
            />
            <Input
              label="SMTP Port"
              type="number"
              value={settings.smtp_port ?? "587"}
              onChange={(e) => updateSetting("smtp_port", e.target.value)}
            />
            <Input
              label="SMTP Username"
              value={settings.smtp_user ?? ""}
              onChange={(e) => updateSetting("smtp_user", e.target.value)}
              placeholder="your@email.com"
            />
            <Input
              label="SMTP Password"
              type="password"
              value={settings.smtp_password ?? ""}
              onChange={(e) => updateSetting("smtp_password", e.target.value)}
            />
            <Input
              label="From Email (sender name)"
              value={settings.smtp_from ?? ""}
              onChange={(e) => updateSetting("smtp_from", e.target.value)}
              placeholder="SalesCRM <noreply@yourcompany.com>"
            />

            <div className="flex items-center justify-between pt-2">
              {saved && <span className="text-sm text-green-600">✓ Settings saved!</span>}
              <div className="ml-auto">
                <Button onClick={saveSettings} loading={saving}>Save Settings</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
