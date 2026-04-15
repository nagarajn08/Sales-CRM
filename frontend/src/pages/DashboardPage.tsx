import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../api";
import type { DashboardStats, SourceCount, StatusCount } from "../types";
import { Badge } from "../components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";
import { cn, fmtDateTime } from "../lib/utils";
import { useAuth } from "../auth/AuthContext";

// ── Tiny helpers ──────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color, delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; delay?: number;
}) {
  return (
    <div
      className="animate-fade-up bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, badge, children }: { title: string; badge?: number; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniBar({ count, max, color }: { count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (count / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-border overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function sourceLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const SOURCE_COLORS: Record<string, string> = {
  manual: "bg-blue-500",
  website: "bg-violet-500",
  facebook: "bg-indigo-500",
  instagram: "bg-pink-500",
  linkedin: "bg-sky-500",
  google_ads: "bg-amber-500",
  reference: "bg-teal-500",
  cold_call: "bg-orange-500",
  import: "bg-slate-500",
  other: "bg-gray-400",
};

const STATUS_BAR_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  call_back: "bg-yellow-500",
  interested_call_back: "bg-teal-500",
  busy: "bg-orange-500",
  not_reachable: "bg-gray-400",
  not_interested: "bg-red-500",
  converted: "bg-emerald-500",
};

// ── Icons ─────────────────────────────────────────────────────────────────
const I = {
  total:     <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  active:    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M8 2v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/></svg>,
  check:     <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  alert:     <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  plus:      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  calendar:  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  lightning: <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  thumb:     <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M5 14V8l2-5a1.5 1.5 0 013 0v3h3l-1 8H5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  week:      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  activity:  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M1 8h3l2-5 3 10 2-5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
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

  const sourceMax = Math.max(...stats.leads_by_source_today.map(s => s.count), 1);
  const sourceAllMax = Math.max(...stats.leads_by_source_all.map(s => s.count), 1);
  const statusMax = Math.max(...stats.status_breakdown.map(s => s.count), 1);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">{greeting}, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); dashboardApi.stats().then(setStats).finally(() => setLoading(false)); }}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M13 3A6 6 0 1014 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M13 3v3.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Refresh
        </button>
      </div>

      {/* ── Row 1: Today's pulse (4 cols) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="New Leads Today" value={stats.new_leads_today} sub={`${stats.new_leads_this_week} this week`}
          icon={I.plus} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" delay={0} />
        <KpiCard label="Converted Today" value={stats.converted_today} sub={`${stats.converted_this_week} this week`}
          icon={I.check} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" delay={40} />
        <KpiCard label="Follow-ups Done" value={stats.followups_done_today} sub="status updates today"
          icon={I.lightning} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" delay={80} />
        <KpiCard label="Activities Today" value={stats.activities_today} sub="comments, calls, emails"
          icon={I.activity} color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" delay={120} />
      </div>

      {/* ── Row 2: Pipeline health (4 cols) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Leads" value={stats.total_leads} sub={`${stats.active_leads} active`}
          icon={I.total} color="bg-primary/10 text-primary" delay={0} />
        <KpiCard label="Due Today" value={stats.followups_due_today} sub="scheduled for today"
          icon={I.calendar} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" delay={40} />
        <KpiCard label="Overdue" value={stats.followups_overdue} sub="past follow-up date"
          icon={I.alert} color="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" delay={80} />
        <KpiCard label="Not Interested" value={stats.not_interested_today} sub="lost today"
          icon={I.thumb} color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" delay={120} />
      </div>

      {/* ── Row 3: 3-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Today's leads by source */}
        <SectionCard title="Today's Leads by Source">
          {stats.leads_by_source_today.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No leads added today yet</div>
          ) : (
            <div className="p-4 space-y-3">
              {stats.leads_by_source_today.map((s: SourceCount) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{sourceLabel(s.source)}</span>
                    <span className="tabular-nums text-muted-foreground font-semibold">{s.count}</span>
                  </div>
                  <MiniBar count={s.count} max={sourceMax} color={SOURCE_COLORS[s.source] ?? "bg-primary"} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Status breakdown */}
        <SectionCard title="Pipeline Breakdown">
          {stats.status_breakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No active leads</div>
          ) : (
            <div className="p-4 space-y-3">
              {stats.status_breakdown.map((s: StatusCount) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground font-semibold">{s.count}</span>
                  </div>
                  <MiniBar count={s.count} max={statusMax} color={STATUS_BAR_COLORS[s.status] ?? "bg-primary"} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* All-time source mix */}
        <SectionCard title="All-Time Lead Sources">
          {stats.leads_by_source_all.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No leads yet</div>
          ) : (
            <div className="p-4 space-y-3">
              {stats.leads_by_source_all.slice(0, 8).map((s: SourceCount) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", SOURCE_COLORS[s.source] ?? "bg-primary")} />
                      <span className="font-medium text-foreground">{sourceLabel(s.source)}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground font-semibold">
                      {stats.total_leads > 0 ? `${Math.round(s.count / stats.total_leads * 100)}%` : "—"} · {s.count}
                    </span>
                  </div>
                  <MiniBar count={s.count} max={sourceAllMax} color={SOURCE_COLORS[s.source] ?? "bg-primary"} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

      </div>

      {/* ── Row 4: Due follow-ups + Team performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Due follow-ups */}
        <SectionCard title="Follow-up Queue" badge={stats.due_followups.length}>
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
              stats.due_followups.slice(0, 8).map((lead) => {
                const fo = lead.next_followup_at;
                const isOverdue = fo ? new Date(fo.endsWith("Z") ? fo : fo + "Z") < new Date() : false;
                return (
                  <button
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{lead.name}</p>
                      <p className={cn("text-[11px] mt-0.5 font-mono", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                        {isOverdue ? "⚠ " : "📅 "}{fmtDateTime(lead.next_followup_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                      <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {stats.due_followups.length > 8 && (
            <div className="px-4 py-2 border-t border-border">
              <button onClick={() => navigate("/leads?overdue=true")} className="text-xs text-primary hover:underline">
                +{stats.due_followups.length - 8} more → View all
              </button>
            </div>
          )}
        </SectionCard>

        {/* Team performance */}
        {isAdmin && (
          <SectionCard title="Team Performance">
            {stats.user_stats.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No team members yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Member</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Total</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">New</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">CB</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">ICB</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-emerald-600">Conv</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-red-500">OD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.user_stats.map((u) => (
                      <tr key={u.user_id} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[110px]">{u.user_name}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums">{u.total_leads}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-500">{u.new}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-yellow-600">{u.call_back}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-teal-600">{u.interested_call_back}</td>
                        <td className="px-2 py-2.5 text-center tabular-nums font-semibold text-emerald-600">{u.converted}</td>
                        <td className={cn("px-2 py-2.5 text-center tabular-nums font-semibold", u.overdue_followups > 0 ? "text-red-500" : "text-muted-foreground")}>
                          {u.overdue_followups}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-border flex gap-4 text-[10px] text-muted-foreground">
                  <span>CB = Call Back</span>
                  <span>ICB = Interested CB</span>
                  <span>OD = Overdue</span>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* For non-admin: show own summary instead */}
        {!isAdmin && (
          <SectionCard title="My Summary">
            <div className="p-4 space-y-3">
              {[
                { label: "My Total Leads", value: stats.total_leads },
                { label: "Active", value: stats.active_leads },
                { label: "Converted Today", value: stats.converted_today },
                { label: "Overdue Follow-ups", value: stats.followups_overdue },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

      </div>

    </div>
  );
}
