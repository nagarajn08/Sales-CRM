import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../api";
import type { DashboardStats } from "../types";
import { Badge } from "../components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";
import { cn } from "../lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
}

function StatCard({ label, value, icon, iconBg, delay = 0 }: StatCardProps) {
  return (
    <div
      className="animate-fade-up bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
        </div>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-sm text-muted-foreground">Failed to load dashboard.</p>;

  return (
    <div className="space-y-6">

      <div className="animate-fade-up">
        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your sales pipeline</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Leads" value={stats.total_leads} delay={0}
          iconBg="bg-primary/10"
          icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-primary"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="Active" value={stats.active_leads} delay={50}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-blue-500"><path d="M8 2v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/></svg>}
        />
        <StatCard
          label="Converted Today" value={stats.converted_today} delay={100}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-emerald-500"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        />
        <StatCard
          label="Overdue" value={stats.overdue_followups} delay={150}
          iconBg="bg-red-50 dark:bg-red-900/20"
          icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-red-500"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="New Today" value={stats.new_leads_today} delay={200}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
          icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-violet-500"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Due today */}
        <div
          className="animate-fade-up bg-card border border-border rounded-xl shadow-sm overflow-hidden"
          style={{ "--delay": "180ms" } as React.CSSProperties}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Due Follow-ups Today</h2>
            {stats.due_followups.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {stats.due_followups.length}
              </span>
            )}
          </div>

          <div className="divide-y divide-border">
            {stats.due_followups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 mb-2 opacity-30">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              stats.due_followups.slice(0, 10).map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.mobile ?? lead.email ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                    <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Team performance */}
        <div
          className="animate-fade-up bg-card border border-border rounded-xl shadow-sm overflow-hidden"
          style={{ "--delay": "220ms" } as React.CSSProperties}
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Team Performance</h2>
          </div>

          {stats.user_stats.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No data yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Member</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Converted</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.user_stats.map((u) => (
                  <tr key={u.user_id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-foreground truncate max-w-[140px]">{u.user_name}</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground tabular-nums">{u.total_leads}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-emerald-600 tabular-nums">{u.converted}</td>
                    <td className={cn("px-4 py-3 text-center text-sm font-semibold tabular-nums", u.overdue_followups > 0 ? "text-red-500" : "text-muted-foreground")}>{u.overdue_followups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
