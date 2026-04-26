import { useEffect, useState } from "react";
import { billingApi } from "../api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";

type BillingData = Awaited<ReturnType<typeof billingApi.get>>;
type PlanDef = { name: string; price: number; original_price: number; discount_pct: number; max_users: number; max_leads: number; features: string[] };


export default function BillingPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBilling = () => {
    setLoading(true);
    billingApi.get().then(setBilling).finally(() => setLoading(false));
  };

  useEffect(fetchBilling, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    setMessage(null);
    try {
      const res = await billingApi.upgrade("pro");

      if (res.demo) {
        setMessage({ type: "error", text: "Payment gateway not configured. Please contact admin to enable payments before upgrading." });
        return;
      }

      const Razorpay = (window as unknown as { Razorpay: new (opts: object) => { open(): void } }).Razorpay;
      if (!Razorpay) {
        setMessage({ type: "error", text: "Razorpay SDK not loaded. Please refresh." });
        return;
      }

      const rzp = new Razorpay({
        key: res.razorpay_key_id,
        subscription_id: res.subscription_id,
        name: "TrackmyLead",
        description: "Pro Plan — Monthly",
        theme: { color: "#6366f1" },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            await billingApi.activate({
              plan: "pro",
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setMessage({ type: "success", text: "Successfully upgraded to Pro plan!" });
            fetchBilling();
          } catch {
            setMessage({ type: "error", text: "Payment verified but activation failed. Contact support." });
          }
        },
      });
      rzp.open();

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMessage({ type: "error", text: msg ?? "Failed to initiate upgrade." });
    } finally {
      setUpgrading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!billing) return <p className="text-sm text-muted-foreground">Failed to load billing info.</p>;

  const plans = billing.plans as Record<string, PlanDef>;
  const currentPlan = billing.plan;
  const isPro = currentPlan === "pro";
  const proPlan = plans["pro"];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and usage</p>
      </div>

      {/* Demo mode banner */}
      {billing.demo_mode && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 5v3.5M8 10.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="font-semibold">Demo Mode — No payment required</p>
            <p className="mt-0.5 text-amber-700">
              Upgrades are instant and free for testing.
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={cn(
          "flex items-center gap-2.5 p-3 rounded-xl text-sm border",
          message.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {message.type === "success" ? "✓" : "✕"} {message.text}
        </div>
      )}

      {/* Current usage */}
      <div className={cn(
        "relative rounded-2xl p-6 overflow-hidden border",
        isPro
          ? "bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-500 text-white"
          : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white"
      )}>
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={cn("absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-20", isPro ? "bg-violet-300" : "bg-slate-400")} />
          <div className={cn("absolute -bottom-6 -left-6 h-28 w-28 rounded-full opacity-10", isPro ? "bg-indigo-300" : "bg-slate-300")} />
        </div>

        <div className="relative flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Current Plan</p>
            <p className="text-2xl font-bold tracking-tight">{billing.plan_name}</p>
            {billing.current_period_end && (
              <p className="text-xs opacity-60 mt-1">
                Renews on {new Date(billing.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <div className={cn(
            "flex items-center justify-center h-12 w-12 rounded-xl shrink-0",
            isPro ? "bg-white/15" : "bg-white/10"
          )}>
            {isPro ? (
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-white">
                <path d="M10 2l2.4 5.6 6 .6-4.4 4 1.4 5.8L10 15l-5.4 3 1.4-5.8L1.6 8.2l6-.6z" fill="currentColor" opacity=".9"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-white">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Users", current: billing.users.current, max: billing.users.max },
            { label: "Leads", current: billing.leads.current, max: billing.leads.max },
          ].map(({ label, current, max }) => {
            const unlimited = max === -1;
            const pct = unlimited ? 0 : Math.min((current / max) * 100, 100);
            const warn = !unlimited && pct >= 80;
            return (
              <div key={label} className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70 mb-1">{label}</p>
                <p className="text-xl font-bold tabular-nums">
                  {current}
                  <span className="text-sm font-normal opacity-60 ml-1">/ {unlimited ? "∞" : max}</span>
                </p>
                {!unlimited && (
                  <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", warn ? "bg-amber-300" : "bg-white/70")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Free Plan */}
        <div className={cn(
          "relative rounded-xl border-2 p-6 flex flex-col gap-5 transition-all",
          currentPlan === "free"
            ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
            : "border-border bg-card"
        )}>
          {currentPlan === "free" && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-indigo-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap shadow">
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M6 1l1.2 3.6H11L8.2 6.8l1 3.2L6 8.2 2.8 10l1-3.2L1 4.6h3.8z" fill="currentColor"/></svg>
              Your Current Plan
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn("font-bold text-lg", currentPlan === "free" ? "text-indigo-700 dark:text-indigo-300" : "text-foreground")}>Free</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-muted-foreground mt-1">Forever free · No card required</p>
          </div>

          <ul className="space-y-2 flex-1">
            {plans["free"]?.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", currentPlan === "free" ? "text-indigo-400" : "text-border")}>
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Plan */}
        <div className={cn(
          "relative rounded-xl border-2 p-6 flex flex-col gap-5 transition-all",
          isPro
            ? "border-violet-500 bg-gradient-to-br from-violet-50 to-slate-50 dark:from-violet-950/40 dark:to-slate-900 shadow-lg shadow-violet-100 dark:shadow-violet-900/20"
            : "border-violet-400/50 bg-card ring-2 ring-violet-500/10"
        )}>
          {/* Current plan ribbon for Pro */}
          {isPro && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-violet-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap shadow">
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3"><path d="M6 1l1.2 3.6H11L8.2 6.8l1 3.2L6 8.2 2.8 10l1-3.2L1 4.6h3.8z" fill="currentColor"/></svg>
              Your Current Plan
            </div>
          )}
          {/* Discount badge (only when not current) */}
          {!isPro && proPlan?.discount_pct > 0 && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-bold bg-violet-500 text-white px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap shadow">
              {proPlan.discount_pct}% OFF — Limited time
            </span>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn("font-bold text-lg", isPro ? "text-violet-700 dark:text-violet-300" : "text-foreground")}>Pro</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground tabular-nums">
                ₹{proPlan?.price.toLocaleString("en-IN")}
              </p>
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            {proPlan?.original_price > 0 && proPlan.discount_pct > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="line-through">₹{proPlan.original_price.toLocaleString("en-IN")}/mo</span>
                <span className="ml-2 text-emerald-600 font-semibold">Save ₹{(proPlan.original_price - proPlan.price).toLocaleString("en-IN")}/mo</span>
              </p>
            )}
          </div>

          <ul className="space-y-2 flex-1">
            {proPlan?.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <svg viewBox="0 0 12 12" fill="none" className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", isPro ? "text-violet-500" : "text-primary")}>
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {!isPro && (
            <Button className="w-full" loading={upgrading} onClick={handleUpgrade}>
              Upgrade to Pro →
            </Button>
          )}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader><CardTitle className="text-base">FAQ</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            { q: "Can I upgrade anytime?", a: "Yes. Upgrade is instant — you get full Pro access immediately after payment." },
            { q: "What happens when I hit the Free limit?", a: "You'll see an upgrade prompt. Existing data is safe — you just can't add more until you upgrade." },
            { q: "Is the 60% discount permanent?", a: "It's a limited-time launch offer. Lock it in now and the discounted price stays as long as your subscription is active." },
          ].map(({ q, a }) => (
            <div key={q} className="pb-3 border-b border-border last:border-0 last:pb-0">
              <p className="font-medium text-foreground">{q}</p>
              <p className="text-muted-foreground mt-0.5">{a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
