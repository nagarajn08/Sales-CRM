import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Lead, LeadStatus } from "../../types";
import { STATUS_LABELS, PRIORITY_COLORS } from "../../types";
import { Badge } from "../ui/badge";
import { leadsApi } from "../../api";
import { cn, fmtDateTime } from "../../lib/utils";

const KANBAN_COLUMNS: LeadStatus[] = [
  "new",
  "call_back",
  "interested_call_back",
  "busy",
  "not_reachable",
];

const COLUMN_COLORS: Record<LeadStatus, string> = {
  new: "border-t-blue-500",
  call_back: "border-t-yellow-500",
  interested_call_back: "border-t-teal-500",
  busy: "border-t-orange-500",
  not_reachable: "border-t-gray-400",
  not_interested: "border-t-red-500",
  converted: "border-t-emerald-500",
};

interface Props {
  leads: Lead[];
  onLeadsChange: () => void;
}

export function KanbanView({ leads, onLeadsChange }: Props) {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const leadsByStatus = (status: LeadStatus) =>
    leads.filter(l => l.status === status);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDragging(leadId);
  };

  const handleDragOver = (e: React.DragEvent, col: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(col);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging) return;

    const lead = leads.find(l => l.id === dragging);
    if (!lead || lead.status === newStatus) { setDragging(null); return; }

    // Don't allow drag to terminal statuses via kanban (use Update Status instead)
    if (newStatus === "not_interested" || newStatus === "converted") {
      setDragging(null);
      return;
    }

    setUpdating(dragging);
    setDragging(null);
    try {
      await leadsApi.updateStatus(lead.id, { status: newStatus });
      onLeadsChange();
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {KANBAN_COLUMNS.map(col => {
          const colLeads = leadsByStatus(col);
          const isOver = dragOver === col;
          return (
            <div
              key={col}
              className={cn(
                "w-64 shrink-0 rounded-xl border border-border bg-secondary/30 border-t-4 transition-colors",
                COLUMN_COLORS[col],
                isOver && "bg-secondary/60 ring-2 ring-primary/30"
              )}
              onDragOver={e => handleDragOver(e, col)}
              onDrop={e => handleDrop(e, col)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Column Header */}
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-border">
                <span className="text-xs font-semibold text-foreground">{STATUS_LABELS[col]}</span>
                <span className="text-xs font-bold tabular-nums bg-border rounded-full px-2 py-0.5 text-muted-foreground">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {colLeads.map(lead => {
                  const isUpdating = updating === lead.id;
                  const s = lead.next_followup_at;
                  const followupDate = s ? new Date(s.endsWith("Z") ? s : s + "Z") : null;
                  const isOverdue = followupDate ? followupDate < new Date() : false;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className={cn(
                        "bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all select-none group",
                        isUpdating && "opacity-50 pointer-events-none",
                        dragging === lead.id && "opacity-40 rotate-1 scale-105"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 capitalize">
                          {lead.name}
                        </p>
                        <Badge className={cn(PRIORITY_COLORS[lead.priority], "shrink-0 text-[10px] px-1.5")}>
                          {lead.priority}
                        </Badge>
                      </div>

                      {lead.company && (
                        <p className="text-[11px] text-muted-foreground mb-1.5 truncate">{lead.company}</p>
                      )}

                      {lead.mobile && (
                        <p className="text-[11px] font-mono text-muted-foreground mb-1.5 truncate">{lead.mobile}</p>
                      )}

                      {followupDate && (
                        <p className={cn(
                          "text-[10px] font-mono mt-1 flex items-center gap-1",
                          isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                        )}>
                          {isOverdue ? "⚠" : "📅"} {fmtDateTime(lead.next_followup_at)}
                        </p>
                      )}

                      {lead.assigned_to && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          👤 {lead.assigned_to.name}
                        </p>
                      )}

                      {isUpdating && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                          <span className="text-[10px] text-muted-foreground">Updating...</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className={cn(
                    "border-2 border-dashed border-border rounded-lg h-16 flex items-center justify-center transition-colors",
                    isOver && "border-primary/40 bg-primary/5"
                  )}>
                    <p className="text-[11px] text-muted-foreground">
                      {isOver ? "Drop here" : "Empty"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Drag cards between columns to update status · Click a card to view details
      </p>
    </div>
  );
}
