import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { leadsApi } from "../api";
import type { Lead, Activity } from "../types";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS } from "../types";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { StatusModal } from "../components/leads/StatusModal";
import { ReassignModal } from "../components/leads/ReassignModal";
import { CommentModal } from "../components/leads/CommentModal";
import { LeadFormModal } from "../components/leads/LeadFormModal";
import { EmailModal } from "../components/leads/EmailModal";
import { CallLogModal } from "../components/leads/CallLogModal";
import { useAuth } from "../auth/AuthContext";
import { cn, fmtDateTime } from "../lib/utils";
import { ScoreBadge } from "../components/ui/ScoreBadge";
import { customFieldsApi, type CustomFieldDef } from "../api";

const ACTIVITY_ICONS: Record<string, string> = {
  created: "✨",
  status_changed: "🔄",
  comment: "💬",
  reassigned: "👤",
  followup_set: "📅",
  email_sent: "✉️",
  imported: "📤",
  call_log: "📞",
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStatus, setShowStatus] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showCallLog, setShowCallLog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    const [leadData, timelineData, fieldDefs] = await Promise.all([
      leadsApi.get(parseInt(id)),
      leadsApi.timeline(parseInt(id)),
      customFieldsApi.list().catch(() => []),
    ]);
    setLead(leadData);
    setTimeline(timelineData);
    setCustomFieldDefs(fieldDefs);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchLead().finally(() => setLoading(false));
  }, [fetchLead]);

  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      await leadsApi.delete(lead.id);
      navigate("/leads");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="outline" onClick={() => navigate("/leads")} className="mt-4">Back to Leads</Button>
      </div>
    );
  }

  const isTerminal = lead.status === "not_interested" || lead.status === "converted";
  const s = lead.next_followup_at;
  // Force UTC parse for naive backend timestamps
  const followupDate = s ? new Date(s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s) ? s : s + "Z") : null;
  const isOverdue = followupDate ? followupDate < new Date() : false;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}>
          ← Back
        </Button>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {!isTerminal && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowComment(true)}>
                💬 Comment
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCallLog(true)}>
                📞 Log Call
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowStatus(true)}>
                🔄 Update Status
              </Button>
            </>
          )}
          {lead.email && !isTerminal && (
            <Button size="sm" variant="outline" onClick={() => setShowEmail(true)}>
              ✉️ Send Email
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            ✏️ Edit
          </Button>
          {isAdmin && !isTerminal && (
            <Button size="sm" variant="outline" onClick={() => setShowReassign(true)}>
              👤 Reassign
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(true)}>
              🗑 Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl tracking-tight">{lead.name}</CardTitle>
                  <ScoreBadge score={lead.score} size="md" />
                </div>
                {lead.company && <p className="text-muted-foreground text-sm mt-0.5 font-medium">{lead.company}</p>}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                <Badge className={PRIORITY_COLORS[lead.priority]}>{lead.priority} priority</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lead.web_id && <InfoRow label="Web ID" value={lead.web_id} />}
              <InfoRow label="Mobile" value={lead.mobile} />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp</p>
                {(lead.whatsapp || lead.mobile) ? (
                  <a
                    href={`https://wa.me/${(lead.whatsapp || lead.mobile)!.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-0.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {lead.whatsapp || lead.mobile}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">—</p>
                )}
              </div>
              {lead.deal_value != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deal Value</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    ₹{lead.deal_value.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Source" value={lead.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
              <InfoRow label="Assigned To" value={lead.assigned_to?.name ?? "Unassigned"} />
              <InfoRow label="Created By" value={lead.created_by?.name} />
              <InfoRow label="Created" value={fmtDateTime(lead.created_at)} />
              <InfoRow label="Updated" value={fmtDateTime(lead.updated_at)} />

              {/* Custom Fields */}
              {customFieldDefs.length > 0 && lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
                <>
                  {customFieldDefs.map(def => {
                    const val = (lead.custom_fields as Record<string, unknown>)?.[def.name];
                    if (val === undefined || val === null || val === "") return null;
                    const display = def.field_type === "checkbox"
                      ? (val === "true" || val === true ? "Yes" : "No")
                      : String(val);
                    return <InfoRow key={def.id} label={def.label} value={display} />;
                  })}
                </>
              )}
            </div>

            {/* Tags */}
            {lead.tags && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground font-medium border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            {followupDate ? (
              <div className={cn("rounded-lg p-4 text-center", isOverdue ? "bg-destructive/10 border border-destructive/20" : "bg-secondary")}>
                <p className={cn("font-bold text-lg", isOverdue ? "text-destructive" : "text-foreground")}>
                  {isOverdue ? "⚠️ OVERDUE" : "📅"}
                </p>
                <p className={cn("text-sm mt-1", isOverdue ? "text-destructive" : "text-foreground")}>
                  {fmtDateTime(lead.next_followup_at)}
                </p>
                {isOverdue && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor((Date.now() - followupDate.getTime()) / 86400000)} days ago
                  </p>
                )}
              </div>
            ) : isTerminal ? (
              <div className="rounded-lg bg-secondary p-4 text-center">
                <p className="text-2xl mb-1">{lead.status === "converted" ? "🎉" : "🚫"}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.status === "converted" ? "Lead converted!" : "No further follow-up"}
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-secondary p-4 text-center">
                <p className="text-sm text-muted-foreground">No follow-up scheduled</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowStatus(true)}>
                  Schedule Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No activity yet</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {timeline.map((activity) => (
                <div key={activity.id} className="relative">
                  <div className="absolute -left-4 top-1 h-5 w-5 rounded-full bg-card border-2 border-border flex items-center justify-center text-[10px]">
                    {ACTIVITY_ICONS[activity.activity_type] ?? "•"}
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground capitalize">
                        {activity.activity_type.replace(/_/g, " ")}
                      </span>
                      {activity.old_status && activity.new_status && (
                        <span className="text-xs text-muted-foreground">
                          <Badge className={STATUS_COLORS[activity.old_status as keyof typeof STATUS_COLORS]} variant="outline">
                            {STATUS_LABELS[activity.old_status as keyof typeof STATUS_LABELS] ?? activity.old_status}
                          </Badge>
                          {" → "}
                          <Badge className={STATUS_COLORS[activity.new_status as keyof typeof STATUS_COLORS]}>
                            {STATUS_LABELS[activity.new_status as keyof typeof STATUS_LABELS] ?? activity.new_status}
                          </Badge>
                        </span>
                      )}
                    </div>
                    {activity.comment && (
                      <p className="text-sm text-foreground mt-0.5 bg-secondary rounded-lg px-3 py-2">{activity.comment}</p>
                    )}
                    {activity.followup_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Scheduled: {fmtDateTime(activity.followup_date)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {activity.user?.name ?? "System"} · {fmtDateTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-foreground mb-2">Delete Lead?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong>{lead.name}</strong> and all their activity. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StatusModal open={showStatus} onClose={() => setShowStatus(false)} lead={lead}
        onUpdated={(l) => { setLead(l); fetchLead(); }} />
      <ReassignModal open={showReassign} onClose={() => setShowReassign(false)} lead={lead}
        onReassigned={(l) => { setLead(l); fetchLead(); }} />
      <CommentModal open={showComment} onClose={() => setShowComment(false)} lead={lead}
        onCommented={() => fetchLead()} />
      <LeadFormModal open={showEdit} onClose={() => setShowEdit(false)} lead={lead}
        onSaved={(l) => { setLead(l); }} />
      <EmailModal open={showEmail} onClose={() => setShowEmail(false)} lead={lead} />
      <CallLogModal open={showCallLog} onClose={() => setShowCallLog(false)} lead={lead}
        onLogged={() => fetchLead()} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}
