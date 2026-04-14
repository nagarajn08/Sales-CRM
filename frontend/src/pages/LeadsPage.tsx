import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { leadsApi } from "../api";
import type { Lead, LeadStatus, LeadPriority } from "../types";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input, Select } from "../components/ui/input";
import { LeadFormModal } from "../components/leads/LeadFormModal";
import { ImportModal } from "../components/leads/ImportModal";
import { useAuth } from "../auth/AuthContext";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "call_back", label: "Call Back" },
  { value: "busy", label: "Busy" },
  { value: "not_reachable", label: "Not Reachable" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

export default function LeadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "">("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();
      if (overdueOnly) params.overdue = true;
      const data = await leadsApi.list(params);
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, overdueOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const formatFollowup = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now;
    return { label: d.toLocaleString(), overdue: isOverdue };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up">
        <div>
          <h1 className="text-lg font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} total</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>Import</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Lead</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name, mobile, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
          options={STATUS_FILTER_OPTIONS}
          className="sm:w-44"
        />
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as LeadPriority | "")}
          options={PRIORITY_FILTER_OPTIONS}
          className="sm:w-36"
        />
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded"
          />
          Overdue only
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : leads.length === 0 ? (
        <div className="animate-fade-in text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <p className="font-data text-3xl font-medium text-muted-foreground/40 mb-3">0</p>
          <p className="font-medium text-foreground text-sm">No leads found</p>
          <p className="text-sm mt-1">Adjust filters or add a new lead</p>
        </div>
      ) : (
        <div className="animate-fade-in rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Web ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Follow-up</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Assigned To</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => {
                  const followup = formatFollowup(lead.next_followup_at);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{lead.name}</p>
                        {lead.company && <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="font-data text-xs text-muted-foreground">
                          {lead.web_id ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        <p className="font-data text-xs">{lead.mobile ?? "—"}</p>
                        {lead.email && <p className="text-xs mt-0.5">{lead.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {followup ? (
                          <span className={`font-data text-xs ${followup.overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {followup.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                          {lead.assigned_to?.name ?? <span className="italic">Unassigned</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={(lead) => setLeads((prev) => [lead, ...prev])}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchLeads}
      />
    </div>
  );
}
