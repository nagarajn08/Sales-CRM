import { useEffect, useState } from "react";
import { dashboardApi, leadsApi } from "../api";
import type { DashboardStats, Lead } from "../types";
import { STATUS_LABELS } from "../types";
import { ScoreBadge } from "../components/ui/ScoreBadge";
import { cn } from "../lib/utils";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── constants ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "7 days",  value: 7  },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const STATUS_COLORS_MAP: Record<string, string> = {
  new:                  "#6366f1",
  call_back:            "#f59e0b",
  interested_call_back: "#10b981",
  busy:                 "#f97316",
  not_reachable:        "#94a3b8",
  not_interested:       "#ef4444",
  converted:            "#059669",
};

const SOURCE_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16","#ec4899",
];

const AVATAR_COLORS = [
  "bg-indigo-500","bg-emerald-500","bg-amber-500",
  "bg-pink-500","bg-cyan-500","bg-violet-500","bg-rose-500",
];

const MEDAL: Record<number, { bg: string; text: string; label: string }> = {
  0: { bg: "bg-yellow-400/20 border border-yellow-400/50", text: "text-yellow-600", label: "🥇" },
  1: { bg: "bg-slate-300/20 border border-slate-400/40",   text: "text-slate-500",  label: "🥈" },
  2: { bg: "bg-orange-400/20 border border-orange-400/40", text: "text-orange-600", label: "🥉" },
};

// ── Horizontal bar list ───────────────────────────────────────────────────────

function BarList({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>;
  return (
    <div className="space-y-3.5 py-1">
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                <span className="text-xs font-semibold text-foreground tabular-nums">{item.value}</span>
                <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">{pct}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: item.color, opacity: 0.85 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: { bg: string; icon: string; bar: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full">
      <div className={cn("h-0.5 w-full", color.bar)} />
      <div className="px-4 py-3.5 flex items-center gap-3 flex-1">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", color.bg)}>
          <span className={color.icon}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none truncate">{label}</p>
          <p className="text-xl font-bold text-foreground mt-1 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Today card ────────────────────────────────────────────────────────────────

function TodayCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3.5 flex items-center gap-3 h-full", accent)}>
      <div className="text-xl leading-none shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-current opacity-70 leading-none">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-none mt-1">{value}</p>
        <p className="text-[10px] opacity-60 mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ── section heading ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="h-3.5 w-0.5 rounded-full bg-primary" />
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{children}</p>
    </div>
  );
}

// ── chart card ────────────────────────────────────────────────────────────────

function ChartCard({
  title, children, action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-semibold text-foreground text-xs">{title}</p>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ── tooltip ───────────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
};

// ── page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<{ date: string; new: number; converted: number }[]>([]);
  const [topLeads, setTopLeads] = useState<Lead[]>([]);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.stats(),
      dashboardApi.trends(period),
      leadsApi.list({ limit: 200 }),
    ]).then(([s, t, leads]) => {
      setStats(s);
      setTrends(t);
      setTopLeads(
        [...leads.leads]
          .filter(l => l.score != null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 10)
      );
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Loading reports…</p>
      </div>
    );
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Failed to load reports.</p>;

  // ── derived ──
  const converted     = stats.status_breakdown.find(s => s.status === "converted")?.count ?? 0;
  const notInterested = stats.status_breakdown.find(s => s.status === "not_interested")?.count ?? 0;
  const active        = stats.total_leads - converted - notInterested;
  const convRate      = stats.total_leads > 0 ? (converted / stats.total_leads * 100).toFixed(1) : "0.0";
  const overdueTotal  = stats.user_stats.reduce((a, u) => a + u.overdue_followups, 0);
  const totalTrendNew = trends.reduce((a, d) => a + d.new, 0);
  const totalTrendConv= trends.reduce((a, d) => a + d.converted, 0);

  const sourceData = stats.leads_by_source_all.map(s => ({
    name:  s.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: s.count,
  }));

  const statusData = stats.status_breakdown.map(s => ({
    name:  STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] ?? s.status,
    count: s.count,
    fill:  STATUS_COLORS_MAP[s.status] ?? "#6366f1",
  }));

  return (
    <div className="space-y-7 max-w-5xl">

      {/* ── Header banner ── */}
      <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-5 py-4 text-white shadow-lg">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 right-24 h-24 w-24 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-widest">Analytics</p>
            <h1 className="font-display text-2xl font-bold mt-0.5 tracking-tight">Reports</h1>
            <p className="text-sm opacity-70 mt-1">Pipeline analytics &amp; team performance</p>
          </div>

          {/* hero stat */}
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{convRate}%</p>
              <p className="text-[10px] opacity-60 mt-0.5">Conversion Rate</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.total_leads}</p>
              <p className="text-[10px] opacity-60 mt-0.5">Total Leads</p>
            </div>
          </div>

          {/* period toggle */}
          <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-xl p-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === opt.value
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white/70 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overview KPIs ── */}
      <div>
        <SectionTitle>Overview</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <KpiCard
            label="Total Leads"
            value={stats.total_leads}
            sub="all time"
            color={{ bg: "bg-indigo-500/10", icon: "text-indigo-500", bar: "bg-indigo-500" }}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M2 17c0-3 2.24-5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="14" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M11 17c0-3 1.79-5 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Active"
            value={active}
            sub="in pipeline"
            color={{ bg: "bg-blue-500/10", icon: "text-blue-500", bar: "bg-blue-500" }}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Converted"
            value={converted}
            sub={`${convRate}% rate`}
            color={{ bg: "bg-emerald-500/10", icon: "text-emerald-600", bar: "bg-emerald-500" }}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <KpiCard
            label="Overdue"
            value={overdueTotal}
            sub="needs attention"
            color={{
              bg:   overdueTotal > 0 ? "bg-amber-500/10" : "bg-secondary",
              icon: overdueTotal > 0 ? "text-amber-600"  : "text-muted-foreground",
              bar:  overdueTotal > 0 ? "bg-amber-500"    : "bg-border",
            }}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10 6.5V11l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
        </div>
      </div>

      {/* ── Today ── */}
      <div>
        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
          <TodayCard
            label="Follow-ups Done"
            value={stats.followups_done_today}
            sub="completed today"
            icon="✅"
            accent={stats.followups_done_today > 0
              ? "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
              : "border-border bg-card text-foreground"}
          />
          <TodayCard
            label="Due Today"
            value={stats.followups_due_today}
            sub="scheduled follow-ups"
            icon="📅"
            accent={stats.followups_due_today > 0
              ? "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300"
              : "border-border bg-card text-foreground"}
          />
          <TodayCard
            label="New Leads"
            value={stats.new_leads_today}
            sub="added today"
            icon="🚀"
            accent={stats.new_leads_today > 0
              ? "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
              : "border-border bg-card text-foreground"}
          />
        </div>
      </div>

      {/* ── Trend chart ── */}
      <div>
        <SectionTitle>Lead Trend</SectionTitle>
        <ChartCard
          title={`New vs Converted — Last ${period} days`}
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />{totalTrendNew} new
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />{totalTrendConv} converted
              </span>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trends} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
                interval={period <= 7 ? 0 : Math.floor(period / 7)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="new"       name="New Leads" stroke="#6366f1" fill="url(#gNew)"  strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
              <Area type="monotone" dataKey="converted" name="Converted"  stroke="#10b981" fill="url(#gConv)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Status + Source breakdown ── */}
      <div>
        <SectionTitle>Breakdown</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard
            title="Pipeline by Status"
            action={<span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">{stats.total_leads} leads</span>}
          >
            <BarList
              total={stats.total_leads}
              items={statusData.map(s => ({ label: s.name, value: s.count, color: s.fill }))}
            />
          </ChartCard>

          <ChartCard
            title="Leads by Source"
            action={<span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">{stats.total_leads} leads</span>}
          >
            <BarList
              total={stats.total_leads}
              items={sourceData.map((s, i) => ({ label: s.name, value: s.value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }))}
            />
          </ChartCard>
        </div>
      </div>

      {/* ── Team performance ── */}
      {stats.user_stats.length > 0 && (
        <div>
          <SectionTitle>Team Performance</SectionTitle>
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Agent</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Active</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-teal-600 uppercase tracking-wide">Interested</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Won</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-red-500 uppercase tracking-wide">Lost</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-amber-600 uppercase tracking-wide">Overdue</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.user_stats
                    .slice()
                    .sort((a, b) => b.converted - a.converted)
                    .map((u, idx) => {
                      const rate    = u.total_leads > 0 ? ((u.converted / u.total_leads) * 100).toFixed(0) : "0";
                      const active  = u.total_leads - u.converted - u.not_interested;
                      const initials= u.user_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                      const medal   = MEDAL[idx];
                      return (
                        <tr key={u.user_id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {/* rank / medal */}
                              {medal ? (
                                <span className={cn("h-6 w-6 rounded-lg text-sm flex items-center justify-center shrink-0", medal.bg)}>
                                  {medal.label}
                                </span>
                              ) : (
                                <span className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
                                  {idx + 1}
                                </span>
                              )}
                              {/* avatar */}
                              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                                {initials}
                              </div>
                              <span className="font-medium text-foreground capitalize truncate max-w-[100px]">{u.user_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-foreground text-xs">{u.total_leads}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground text-xs">{active}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-teal-600 font-medium text-xs">{u.interested_call_back}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-xs">
                            <span className="font-bold text-emerald-600">{u.converted}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-red-500 text-xs">{u.not_interested}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-xs">
                            {u.overdue_followups > 0
                              ? <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />{u.overdue_followups}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                  style={{ width: `${Math.min(Number(rate), 100)}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[36px] text-center",
                                Number(rate) >= 30
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : Number(rate) >= 15
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                  : "bg-secondary text-muted-foreground"
                              )}>
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Top scoring leads ── */}
      {topLeads.length > 0 && (
        <div>
          <SectionTitle>Top Leads by Score</SectionTitle>
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {topLeads.map((lead, i) => {
                const rankColors = [
                  "bg-yellow-400 text-white",
                  "bg-slate-400 text-white",
                  "bg-orange-400 text-white",
                ];
                return (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors group">
                    <span className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                      rankColors[i] ?? "bg-secondary text-muted-foreground"
                    )}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate capitalize group-hover:text-primary transition-colors">{lead.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {lead.company && <span>{lead.company}</span>}
                        {lead.company && <span className="opacity-40">·</span>}
                        <span>{STATUS_LABELS[lead.status] ?? lead.status}</span>
                        {lead.assigned_to && <><span className="opacity-40">·</span><span className="capitalize">{lead.assigned_to.name}</span></>}
                      </p>
                    </div>
                    <ScoreBadge score={lead.score} size="md" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
