import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { leadsApi, usersApi } from "../api";
import type { Lead, LeadStatus, LeadPriority, LeadSource, User } from "../types";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input, Select } from "../components/ui/input";
import { LeadFormModal } from "../components/leads/LeadFormModal";
import { ImportModal } from "../components/leads/ImportModal";
import { KanbanView } from "../components/leads/KanbanView";
import { useAuth } from "../auth/AuthContext";
import { fmtDateTime, cn } from "../lib/utils";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "call_back", label: "Call Back" },
  { value: "interested_call_back", label: "Interested - Call Back" },
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

const SOURCE_FILTER_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
  { value: "website", label: "Website" },
  { value: "reference", label: "Reference" },
  { value: "cold_call", label: "Cold Call" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google_ads", label: "Google Ads" },
  { value: "other", label: "Other" },
];

const BULK_STATUS_OPTIONS = [
  { value: "", label: "Change status to..." },
  { value: "new", label: "New" },
  { value: "call_back", label: "Call Back" },
  { value: "interested_call_back", label: "Interested - Call Back" },
  { value: "busy", label: "Busy" },
  { value: "not_reachable", label: "Not Reachable" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
];

type ViewMode = "table" | "kanban";

export default function LeadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "manager";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkUsers, setBulkUsers] = useState<User[]>([]);
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);


  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (search.trim()) params.search = search.trim();
      if (overdueOnly) params.overdue = true;
      if (tagFilter.trim()) params.tag = tagFilter.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await leadsApi.list(params);
      setLeads(data);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, sourceFilter, search, overdueOnly, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  useEffect(() => {
    if (isAdmin) usersApi.list().then(setBulkUsers).catch(() => {});
  }, [isAdmin]);

  const formatFollowup = (date: string | null) => {
    if (!date) return null;
    const s = date.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(date) ? date : date + "Z";
    const d = new Date(s);
    const isOverdue = d < new Date();
    return { label: fmtDateTime(date), overdue: isOverdue };
  };

  // Selection helpers
  const allSelected = leads.length > 0 && leads.every(l => selected.has(l.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const runBulkAction = async (action: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const payload: Record<string, unknown> = { lead_ids: Array.from(selected), action };
      if (action === "status" && bulkStatus) payload.status = bulkStatus;
      if (action === "reassign" && bulkAssignTo) payload.assigned_to_id = parseInt(bulkAssignTo);
      await leadsApi.bulk(payload as Parameters<typeof leadsApi.bulk>[0]);
      setBulkStatus("");
      setBulkAssignTo("");
      await fetchLeads();
    } catch {
      // silently fail
    } finally {
      setBulkLoading(false);
    }
  };

  // Export
  const handleExport = async () => {
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (search.trim()) params.search = search.trim();
      if (tagFilter.trim()) params.tag = tagFilter.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const blob = await leadsApi.export(params);
      const url = URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setSourceFilter("");
    setTagFilter("");
    setOverdueOnly(false);
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = !!(statusFilter || priorityFilter || sourceFilter || tagFilter || overdueOnly || dateFrom || dateTo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Leads</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{leads.length} leads found</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><rect x="1" y="1" width="14" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="6" width="14" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="11" width="14" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3"/></svg>
              Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 border-l border-border",
                viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><rect x="1" y="1" width="4" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="6" y="1" width="4" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="1" width="4" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.3"/></svg>
              Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} title="Export CSV">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 mr-1"><path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>Import</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Lead</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by name, mobile, email, company, Web ID..."
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
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border transition-colors",
              showMoreFilters || hasActiveFilters
                ? "bg-primary/10 border-primary/30 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Filters {hasActiveFilters && <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-px font-bold">!</span>}
          </button>
        </div>

        {showMoreFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-secondary/40 rounded-xl border border-border animate-fade-up">
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")}
              options={SOURCE_FILTER_OPTIONS}
              className="w-40"
            />
            <Input
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-36"
            />
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} className="rounded" />
              Overdue only
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-destructive hover:underline ml-auto">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="animate-fade-up flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          <div className="flex-1" />

          {/* Bulk status */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
            >
              {BULK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button size="sm" variant="outline" disabled={!bulkStatus || bulkLoading}
              onClick={() => runBulkAction("status")}>
              Apply
            </Button>
          </div>

          {/* Bulk reassign (admin only) */}
          {isAdmin && bulkUsers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={bulkAssignTo}
                onChange={e => setBulkAssignTo(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">Reassign to...</option>
                {bulkUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={!bulkAssignTo || bulkLoading}
                onClick={() => runBulkAction("reassign")}>
                Assign
              </Button>
            </div>
          )}

          {/* Bulk delete (admin only) */}
          {isAdmin && (
            <Button size="sm" variant="destructive" loading={bulkLoading}
              onClick={() => {
                if (confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`))
                  runBulkAction("delete");
              }}>
              Delete {selected.size}
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : leads.length === 0 ? (
        <div className="animate-fade-in text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <p className="font-data text-3xl font-medium text-muted-foreground/40 mb-3">0</p>
          <p className="font-medium text-foreground text-sm">No leads found</p>
          <p className="text-sm mt-1">Adjust filters or add a new lead</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs text-primary hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="animate-fade-in">
          <KanbanView leads={leads} onLeadsChange={fetchLeads} />
        </div>
      ) : (
        <div className="animate-fade-in rounded-xl border border-border overflow-hidden bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Web ID</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Follow-up</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Tags</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Last Comment</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Assigned To</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => {
                  const followup = formatFollowup(lead.next_followup_at);
                  const isSelected = selected.has(lead.id);
                  const tags = lead.tags ? lead.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "hover:bg-secondary/40 cursor-pointer transition-colors group",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lead.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[180px]" onClick={() => navigate(`/leads/${lead.id}`)}>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{lead.name}</p>
                        {lead.company && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.company}</p>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell" onClick={() => navigate(`/leads/${lead.id}`)}>
                        <span className="font-data text-xs text-muted-foreground">{lead.web_id ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div onClick={() => navigate(`/leads/${lead.id}`)}>
                            <p className="font-data text-xs">{lead.mobile ?? "—"}</p>
                            {lead.email && <p className="text-xs mt-0.5 truncate max-w-[120px]">{lead.email}</p>}
                          </div>
                          {(lead.whatsapp || lead.mobile) && (
                            <a
                              href={`https://wa.me/${(lead.whatsapp || lead.mobile)!.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              title="Open WhatsApp"
                              className="ml-1 text-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={() => navigate(`/leads/${lead.id}`)}>
                        <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={() => navigate(`/leads/${lead.id}`)}>
                        <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell" onClick={() => navigate(`/leads/${lead.id}`)}>
                        {followup ? (
                          <span className={`font-data text-xs ${followup.overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {followup.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell" onClick={() => navigate(`/leads/${lead.id}`)}>
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                                {tag}
                              </span>
                            ))}
                            {tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell max-w-[200px]" onClick={() => navigate(`/leads/${lead.id}`)}>
                        {lead.last_comment ? (
                          <p className="text-xs text-muted-foreground truncate" title={lead.last_comment}>
                            💬 {lead.last_comment}
                          </p>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs" onClick={() => navigate(`/leads/${lead.id}`)}>
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
