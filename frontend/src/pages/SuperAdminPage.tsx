import { useEffect, useState } from "react";
import { superAdminApi } from "../api";
import type { OrgSummary, PlatformStats } from "../types";
import { cn, fmtDate } from "../lib/utils";

function StatTile({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1 tabular-nums", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function OrgTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      type === "corporate"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
    )}>
      {type === "corporate" ? "Corporate" : "Individual"}
    </span>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-block h-2 w-2 rounded-full",
      active ? "bg-emerald-500" : "bg-red-400"
    )} />
  );
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "individual" | "corporate">("all");

  useEffect(() => {
    Promise.all([superAdminApi.stats(), superAdminApi.listOrgs()])
      .then(([s, o]) => { setStats(s); setOrgs(o); })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (org: OrgSummary) => {
    setToggling(org.id);
    try {
      const updated = await superAdminApi.toggleOrg(org.id);
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: updated.is_active } : o));
    } finally {
      setToggling(null);
    }
  };

  const filtered = orgs.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.owner_email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.type === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-foreground">Platform Admin</h1>
            <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">Super Admin</span>
          </div>
          <p className="text-sm text-muted-foreground">All organizations across the platform</p>
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ "--delay": "50ms" } as React.CSSProperties}>
          <StatTile label="Total Organizations" value={stats.total_orgs}
            sub={`${stats.individual_orgs} individual · ${stats.corporate_orgs} corporate`}
            color="text-foreground" />
          <StatTile label="Total Users" value={stats.total_users} color="text-foreground" />
          <StatTile label="Total Leads" value={stats.total_leads}
            sub={`${stats.active_leads} active`} color="text-foreground" />
          <StatTile label="Converted Today" value={stats.converted_today} color="text-emerald-600" />
        </div>
      )}

      {/* Orgs table */}
      <div className="animate-fade-up bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        style={{ "--delay": "120ms" } as React.CSSProperties}>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
          <input
            type="text"
            placeholder="Search by name or owner email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-secondary rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-transparent"
          />
          <div className="flex gap-1 p-1 bg-secondary rounded-lg shrink-0">
            {(["all", "individual", "corporate"] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                  filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Owner</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Users</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Leads</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Active</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Converted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Joined</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    No organizations found
                  </td>
                </tr>
              ) : (
                filtered.map(org => (
                  <tr key={org.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot active={org.is_active} />
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground">ID #{org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><OrgTypeBadge type={org.type} /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-foreground">{org.owner_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{org.owner_email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums hidden sm:table-cell text-foreground">{org.user_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums hidden lg:table-cell text-foreground">{org.lead_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums hidden lg:table-cell text-foreground">{org.active_lead_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums hidden xl:table-cell text-emerald-600 font-medium">{org.converted_count}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {fmtDate(org.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(org)}
                        disabled={toggling === org.id}
                        className={cn(
                          "text-xs font-medium px-3 py-1 rounded-full transition-colors border",
                          org.is_active
                            ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20",
                          toggling === org.id && "opacity-50 pointer-events-none"
                        )}
                      >
                        {toggling === org.id ? "…" : org.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
