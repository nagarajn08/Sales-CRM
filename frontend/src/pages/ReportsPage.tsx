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
  { label: "7d",  value: 7  },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const STATUS_COLORS_MAP: Record<string, string> = {
  new:                    "#6366f1",
  call_back:              "#f59e0b",
  interested_call_back:   "#10b981",
  busy:                   "#f97316",
  not_reachable:          "#94a3b8",
  not_interested:         "#ef4444",
  converted:              "#059669",
};

const SOURCE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899",
];

// ── Horizontal bar list ───────────────────────────────────────────────────────

function BarList({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>;
  return (
    <div className="space-y-3 px-1 py-1">
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xs text-muted-foreground tabular-nums">{item.value}</span>
                <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: item.color }}
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
  label, value, sub, icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string; // tailwind bg + text classes for the icon pill
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── section heading ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{children}</p>
  );
}

// ── chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {badge && <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="px-2 pb-4">{children}</div>
    </div>
  );
}

// ── tooltip style ─────────────────────────────────────────────────────────────

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
        [...leads]
          .filter(l => l.score != null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 10)
      );
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Failed to load reports.</p>;
  }

  // ── derived numbers ──
  const converted    = stats.status_breakdown.find(s => s.status === "converted")?.count ?? 0;
  const notInterested = stats.status_breakdown.find(s => s.status === "not_interested")?.count ?? 0;
  const active       = stats.total_leads - converted - notInterested;
  const convRate     = stats.total_leads > 0 ? (converted / stats.total_leads * 100).toFixed(1) : "0.0";
  const overdueTotal = stats.user_stats.reduce((a, u) => a + u.overdue_followups, 0);

  const totalTrendNew       = trends.reduce((a, d) => a + d.new, 0);
  const totalTrendConverted = trends.reduce((a, d) => a + d.converted, 0);

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
    <div className="space-y-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline analytics &amp; team performance</p>
        </div>
        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                period === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div>
        <SectionTitle>Overview</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Leads"
            value={stats.total_leads}
            sub="all time"
            accent="bg-indigo-500/10 text-indigo-500"
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M2 17c0-3 2.24-5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="14" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M11 17c0-3 1.79-5 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Active"
            value={active}
            sub="in pipeline"
            accent="bg-blue-500/10 text-blue-500"
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="Converted"
            value={converted}
            sub={`${convRate}% rate`}
            accent="bg-emerald-500/10 text-emerald-600"
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          <KpiCard
            label="Overdue Follow-ups"
            value={overdueTotal}
            sub="needs attention"
            accent={overdueTotal > 0 ? "bg-amber-500/10 text-amber-600" : "bg-secondary text-muted-foreground"}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
        </div>
      </div>

      {/* ── Today's follow-ups ── */}
      <div>
        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KpiCard
            label="Follow-ups Done Today"
            value={stats.followups_done_today}
            sub="status updates made"
            accent={stats.followups_done_today > 0 ? "bg-violet-500/10 text-violet-500" : "bg-secondary text-muted-foreground"}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/></svg>}
          />
          <KpiCard
            label="Due Today"
            value={stats.followups_due_today}
            sub="scheduled for today"
            accent={stats.followups_due_today > 0 ? "bg-sky-500/10 text-sky-500" : "bg-secondary text-muted-foreground"}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
          />
          <KpiCard
            label="New Leads Today"
            value={stats.new_leads_today}
            sub="added today"
            accent={stats.new_leads_today > 0 ? "bg-teal-500/10 text-teal-600" : "bg-secondary text-muted-foreground"}
            icon={<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M15 4v4M13 6h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
        </div>
      </div>

      {/* ── Trend chart ── */}
      <div>
        <SectionTitle>Lead Trend</SectionTitle>
        <ChartCard
          title={`New vs Converted — Last ${period} days`}
          badge={`${totalTrendNew} new · ${totalTrendConverted} converted`}
        >
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={trends} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18}/>
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
              <Area type="monotone" dataKey="new"       name="New Leads" stroke="#6366f1" fill="url(#gNew)"  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="converted" name="Converted"  stroke="#10b981" fill="url(#gConv)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Status + Source ── */}
      <div>
        <SectionTitle>Breakdown</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Status */}
          <ChartCard title="Pipeline by Status" badge={`${stats.total_leads} total`}>
            <BarList
              total={stats.total_leads}
              items={statusData.map(s => ({ label: s.name, value: s.count, color: s.fill }))}
            />
          </ChartCard>

          {/* Source */}
          <ChartCard title="Leads by Source" badge={`${stats.total_leads} total`}>
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
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Agent</th>
                    <th className="text-center px-3 py-3">Total</th>
                    <th className="text-center px-3 py-3">Active</th>
                    <th className="text-center px-3 py-3">Interested</th>
                    <th className="text-center px-3 py-3 text-emerald-600">Converted</th>
                    <th className="text-center px-3 py-3 text-red-500">Not Int.</th>
                    <th className="text-center px-3 py-3 text-amber-600">Overdue</th>
                    <th className="text-right px-5 py-3">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.user_stats.map((u, idx) => {
                    const rate   = u.total_leads > 0 ? ((u.converted / u.total_leads) * 100).toFixed(0) : "0";
                    const active = u.total_leads - u.converted - u.not_interested;
                    const initials = u.user_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                    const avatarColors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500"];
                    return (
                      <tr key={u.user_id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", avatarColors[idx % avatarColors.length])}>
                              {initials}
                            </div>
                            <span className="font-medium text-foreground">{u.user_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums text-foreground font-medium">{u.total_leads}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">{active}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-teal-600">{u.interested_call_back}</td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          <span className="font-semibold text-emerald-600">{u.converted}</span>
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums text-red-500">{u.not_interested}</td>
                        <td className="px-3 py-3 text-center tabular-nums">
                          {u.overdue_followups > 0
                            ? <span className="text-amber-600 font-semibold">{u.overdue_followups}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={cn(
                            "text-[11px] font-bold px-2.5 py-1 rounded-full",
                            Number(rate) >= 30 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                            Number(rate) >= 15 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                            "bg-secondary text-muted-foreground"
                          )}>
                            {rate}%
                          </span>
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
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {topLeads.map((lead, i) => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                  <span className="text-[11px] font-bold text-muted-foreground w-5 shrink-0 tabular-nums">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-px">
                      {lead.company && <span className="mr-2">{lead.company}</span>}
                      <span>{STATUS_LABELS[lead.status] ?? lead.status}</span>
                      {lead.assigned_to && <span className="ml-2">· {lead.assigned_to.name}</span>}
                    </p>
                  </div>
                  <ScoreBadge score={lead.score} size="md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
