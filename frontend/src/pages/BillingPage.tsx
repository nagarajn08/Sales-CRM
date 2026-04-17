import { useEffect, useState } from "react";
import { billingApi } from "../api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";

type BillingData = Awaited<ReturnType<typeof billingApi.get>>;
type PlanDef = { name: string; price: number; original_price: number; discount_pct: number; max_users: number; max_leads: number; features: string[] };

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min((current / max) * 100, 100);
  const warn = !unlimited && pct >= 80;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", warn ? "text-amber-600" : "text-muted-foreground")}>
          {current} / {unlimited ? "∞" : max}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", warn ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

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
        await billingApi.activate({
          plan: "pro",
          razorpay_subscription_id: res.subscription_id,
        });
        setMessage({ type: "success", text: "Upgraded to Pro plan (demo mode — no payment taken)." });
        fetchBilling();
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
        name: "SalesCRM",
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Current Plan</CardTitle>
            <span className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide",
              isPro ? "bg-violet-100 text-violet-700" : "bg-secondary text-muted-foreground"
            )}>
              {billing.plan_name}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar label="Users" current={billing.users.current} max={billing.users.max} />
            <UsageBar label="Leads" current={billing.leads.current} max={billing.leads.max} />
          </div>
          {billing.current_period_end && (
            <p className="text-xs text-muted-foreground">
              Renews on {new Date(billing.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Free Plan */}
        <div className={cn(
          "relative rounded-xl border-2 p-6 flex flex-col gap-5 bg-card",
          currentPlan === "free" ? "border-border shadow-md" : "border-border"
        )}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-foreground">Free</h3>
              {currentPlan === "free" && (
                <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Current</span>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">₹0</p>
            <p className="text-xs text-muted-foreground mt-1">Forever free · No card required</p>
          </div>

          <ul className="space-y-2 flex-1">
            {plans["free"]?.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5 mt-0.5 shrink-0 text-border">
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {currentPlan === "free" && (
            <div className="text-center text-xs text-muted-foreground py-1 font-medium">Your current plan</div>
          )}
        </div>

        {/* Pro Plan */}
        <div className={cn(
          "relative rounded-xl border-2 p-6 flex flex-col gap-5 bg-card",
          isPro ? "border-violet-500 shadow-md" : "border-violet-500/60 ring-2 ring-violet-500/10"
        )}>
          {/* Discount badge */}
          {proPlan?.discount_pct > 0 && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold bg-violet-500 text-white px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
              {proPlan.discount_pct}% OFF — Limited time
            </span>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-foreground">Pro</h3>
              {isPro && (
                <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Active</span>
              )}
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
                <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary">
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {!isPro ? (
            <Button className="w-full" loading={upgrading} onClick={handleUpgrade}>
              Upgrade to Pro →
            </Button>
          ) : (
            <div className="text-center text-sm font-semibold text-violet-600 py-1">✓ You're on Pro</div>
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
