import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../api";
import type { DashboardStats } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${color} mb-3`}>
          <span className="text-xl">
            {label === "Total Leads" ? "👥" : label === "Active Leads" ? "🔥" : label === "Converted Today" ? "✅" : label === "Overdue" ? "⚠️" : "🆕"}
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
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
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-muted-foreground">Failed to load dashboard.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your sales pipeline</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Leads" value={stats.total_leads} color="bg-primary/10" />
        <StatCard label="Active Leads" value={stats.active_leads} color="bg-blue-100 dark:bg-blue-900/30" />
        <StatCard label="Converted Today" value={stats.converted_today} color="bg-green-100 dark:bg-green-900/30" />
        <StatCard label="Overdue" value={stats.overdue_followups} color="bg-red-100 dark:bg-red-900/30" />
        <StatCard label="New Today" value={stats.new_leads_today} color="bg-purple-100 dark:bg-purple-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due today */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due Follow-ups Today</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.due_followups.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No follow-ups due today 🎉</p>
            ) : (
              <div className="space-y-2">
                {stats.due_followups.slice(0, 10).map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.mobile ?? lead.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                      <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.user_stats.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">User</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Total</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Conv.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.user_stats.map((u) => (
                      <tr key={u.user_id}>
                        <td className="py-2 font-medium text-foreground truncate max-w-[120px]">{u.user_name}</td>
                        <td className="py-2 text-center text-foreground">{u.total_leads}</td>
                        <td className="py-2 text-center text-green-600 font-medium">{u.converted}</td>
                        <td className="py-2 text-center text-red-500 font-medium">{u.overdue_followups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
