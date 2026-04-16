import { useEffect, useState } from "react";
import { dashboardApi, leadsApi } from "../api";
import type { DashboardStats, Lead } from "../types";
import { STATUS_LABELS } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScoreBadge } from "../components/ui/ScoreBadge";
import { cn } from "../lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "#10b981", "#f59e0b", "#6366f1", "#ef4444",
  "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16",
];

function fmtINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-2xl font-bold mt-1", color ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

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
      const sorted = [...leads]
        .filter(l => l.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 10);
      setTopLeads(sorted);
    }).finally(() => setLoading(false));
  }, [period]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Failed to load reports.</p>;

  const conversionRate = stats.total_leads > 0
    ? ((stats.status_breakdown.find(s => s.status === "converted")?.count ?? 0) / stats.total_leads * 100).toFixed(1)
    : "0.0";

  const sourceData = stats.leads_by_source_all.map(s => ({
    name: s.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: s.count,
  }));

  const statusData = stats.status_breakdown.map(s => ({
    name: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] ?? s.status,
    count: s.count,
  }));

  const totalTrendNew = trends.reduce((a, d) => a + d.new, 0);
  const totalTrendConverted = trends.reduce((a, d) => a + d.converted, 0);

  return (
    <div className="space-y-6 max-w-5xl print:max-w-none" id="reports-root">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pipeline analytics and team performance</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  period === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 mr-1.5">
              <path d="M4 6V2h8v4M4 11H2V6h12v5h-2M4 9h8v5H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Print / PDF
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Leads" value={stats.total_leads} />
        <KpiCard label="Active Pipeline" value={fmtINR(stats.pipeline_value)} sub="deal value" color="text-primary" />
        <KpiCard label="Converted Value" value={fmtINR(stats.converted_value)} sub="closed deals" color="text-emerald-600" />
        <KpiCard label="Conversion Rate" value={`${conversionRate}%`} sub="all time" color={Number(conversionRate) >= 20 ? "text-emerald-600" : "text-foreground"} />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lead Trend — Last {period} days</CardTitle>
            <div className="text-xs text-muted-foreground">
              {totalTrendNew} new · {totalTrendConverted} converted
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradConverted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--border))" tickLine={false} interval={period <= 7 ? 0 : Math.floor(period / 7)} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--border))" tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="new" name="New Leads" stroke="hsl(var(--primary))" fill="url(#gradNew)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="converted" name="Converted" stroke="#10b981" fill="url(#gradConverted)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status + Source side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status bar chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--border))" tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--border))" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source pie chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Source</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No source data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team performance */}
      {stats.user_stats.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-semibold">Agent</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Total</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Active</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Interested</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-emerald-600">Converted</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-red-500">Not Int.</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-amber-600">Overdue</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.user_stats.map(u => {
                    const rate = u.total_leads > 0 ? ((u.converted / u.total_leads) * 100).toFixed(0) : "0";
                    const active = u.total_leads - u.converted - u.not_interested;
                    return (
                      <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground">{u.user_name}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{u.total_leads}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{active}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-teal-600">{u.interested_call_back}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 font-semibold">{u.converted}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-red-500">{u.not_interested}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-amber-600">{u.overdue_followups}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            Number(rate) >= 30 ? "bg-emerald-100 text-emerald-700" :
                            Number(rate) >= 15 ? "bg-amber-100 text-amber-700" :
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
          </CardContent>
        </Card>
      )}

      {/* Top scoring leads */}
      {topLeads.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 Leads by Score</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-semibold">Lead</th>
                    <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Assigned To</th>
                    <th className="text-right px-3 py-2.5 font-semibold hidden md:table-cell">Deal Value</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topLeads.map(lead => (
                    <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{lead.name}</p>
                        {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground text-xs">
                        {lead.assigned_to?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-right tabular-nums text-xs text-muted-foreground">
                        {lead.deal_value ? fmtINR(lead.deal_value) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ScoreBadge score={lead.score} size="md" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
