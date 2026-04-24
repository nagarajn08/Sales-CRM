import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { followupsApi, leadsApi, type FollowupLead, type FollowupResponse } from "../api";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────
function toLocalDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  new:                    { label: "New",            dot: "bg-sky-400",    bg: "bg-sky-50 dark:bg-sky-950/40",    text: "text-sky-700 dark:text-sky-300" },
  call_back:              { label: "Call Back",      dot: "bg-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
  interested_call_back:   { label: "Interested",     dot: "bg-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" },
  busy:                   { label: "Busy",           dot: "bg-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300" },
  not_reachable:          { label: "Not Reachable",  dot: "bg-slate-400",  bg: "bg-slate-100 dark:bg-slate-800",  text: "text-slate-600 dark:text-slate-400" },
  not_interested:         { label: "Not Interested", dot: "bg-red-400",    bg: "bg-red-50 dark:bg-red-950/40",    text: "text-red-700 dark:text-red-300" },
  converted:              { label: "Converted",      dot: "bg-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" },
};

const PRIORITY_DOT: Record<string, string> = {
  hot: "bg-red-500", warm: "bg-amber-400", cold: "bg-sky-400",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card shadow-sm">
      <div className={cn("flex items-center justify-center h-8 w-8 rounded-lg shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Follow-up Row ─────────────────────────────────────────────────────────────
function FollowupRow({ lead, isOverdue, onUpdated }: {
  lead: FollowupLead; isOverdue: boolean; onUpdated: () => void;
}) {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const meta = STATUS_META[lead.status] ?? STATUS_META.new;

  const markDone = async (newStatus: string) => {
    setUpdating(true);
    try {
      await leadsApi.updateStatus(lead.id, { status: newStatus });
      toast.success(`Marked as ${STATUS_META[newStatus]?.label ?? newStatus}`);
      onUpdated();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) { toast.error("Pick a date and time"); return; }
    setUpdating(true);
    try {
      await leadsApi.updateStatus(lead.id, {
        status: "call_back",
        next_followup_at: `${rescheduleDate}T${rescheduleTime}:00`,  // naive local datetime — no UTC shift
      });
      toast.success("Rescheduled");
      setRescheduling(false);
      onUpdated();
    } catch {
      toast.error("Failed to reschedule");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative px-4 py-3.5 border-b border-border last:border-0",
        "hover:bg-secondary/30 transition-colors",
        isOverdue ? "border-l-[3px] border-l-red-400" : "border-l-[3px] border-l-primary/40"
      )}
    >
      {/* ── Top row: dot + name/badges + time ── */}
      <div className="flex items-start gap-3">
        <span className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", PRIORITY_DOT[lead.priority])} />

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
            >
              {lead.name}
            </button>
            {lead.web_id && (
              <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                {lead.web_id}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", meta.bg, meta.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dot)} />
              {meta.label}
            </span>
          </div>

          {/* Sub-info */}
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            {lead.mobile && (
              <a href={`tel:${lead.mobile}`} className="hover:text-foreground transition-colors flex items-center gap-1">
                <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
                  <path d="M2 2.5A1.5 1.5 0 013.5 1h.5a1 1 0 011 1v2a1 1 0 01-1 1h-.5A5.5 5.5 0 009 10.5V10a1 1 0 011-1h2a1 1 0 011 1v.5A1.5 1.5 0 0111.5 13C6.25 13 1 7.75 1 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {lead.mobile}
              </a>
            )}
            {lead.company && (
              <span className="hidden sm:flex items-center gap-1">
                <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
                  <rect x="1" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 13V8h4v5M4 1h6v2H4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {lead.company}
              </span>
            )}
            {lead.assigned_to && (
              <span className="hidden md:flex items-center gap-1">
                <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
                  <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1.5 13c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {lead.assigned_to.name}
              </span>
            )}
          </div>

          {lead.last_comment && (
            <p className="mt-1 text-xs text-muted-foreground italic truncate max-w-sm sm:max-w-lg">
              "{lead.last_comment}"
            </p>
          )}
        </div>

        {/* Time + deal value (right) */}
        <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
          <span className={cn("text-xs font-medium flex items-center gap-1", isOverdue ? "text-red-500" : "text-muted-foreground")}>
            {isOverdue && (
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
            {isOverdue ? formatRelative(lead.next_followup_at) : formatTime(lead.next_followup_at)}
          </span>
          {lead.deal_value ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ₹{lead.deal_value.toLocaleString("en-IN")}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Bottom row: Converted (left) | Reschedule + Open (right) ── */}
      <div className="flex items-center justify-between mt-3 pl-5">

        {/* Converted — left, small, secondary so it's not accidentally clicked */}
        {!rescheduling && (
          <button
            onClick={() => markDone("converted")}
            disabled={updating}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Converted
          </button>
        )}
        {rescheduling && <div />}

        {/* Reschedule + Open — right */}
        {rescheduling ? (
          <div className="flex items-end gap-2 flex-wrap justify-end w-full">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Date</span>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="text-[11px] px-2 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-0.5">Time</span>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="text-[11px] px-2 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-24"
              />
            </div>
            <button
              onClick={confirmReschedule}
              disabled={updating}
              className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {updating ? "…" : "Save"}
            </button>
            <button
              onClick={() => setRescheduling(false)}
              className="h-7 px-2.5 text-[11px] rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reschedule — highlighted primary */}
            <button
              onClick={() => setRescheduling(true)}
              disabled={updating}
              className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Reschedule
            </button>
            {/* Open lead */}
            <button
              onClick={() => navigate(`/leads/${lead.id}`)}
              title="Open Lead"
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, badge, badgeColor, leads, isOverdue, emptyMsg, onUpdated }: {
  title: string; badge: number; badgeColor: string;
  leads: FollowupLead[]; isOverdue: boolean; emptyMsg: string; onUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badgeColor)}>
            {badge}
          </span>
        </div>
        <svg
          viewBox="0 0 12 12" fill="none"
          className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        leads.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyMsg}</div>
        ) : (
          <div>
            {leads.map(l => (
              <FollowupRow key={l.id} lead={l} isOverdue={isOverdue} onUpdated={onUpdated} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FollowupPage() {
  const [date, setDate] = useState(toLocalDateStr());
  const [data, setData] = useState<FollowupResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    followupsApi.get(date)
      .then(setData)
      .catch(() => toast.error("Failed to load follow-ups"))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const isToday = date === toLocalDateStr();

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isToday ? "Today's schedule — calls you need to make" : `Schedule for ${new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => setDate(toLocalDateStr())}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
            >
              Today
            </button>
          )}
          <div className="relative flex items-center">
            <svg viewBox="0 0 14 14" fill="none" className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none">
              <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 5.5h12M5 1v2.5M9 1v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <svg viewBox="0 0 14 14" fill="none" className={cn("h-3.5 w-3.5", loading && "animate-spin")}>
              <path d="M12 2A6 6 0 1013 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M12 2v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading && !data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Active"
            value={data.stats.total}
            color="bg-primary/10"
            icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-primary"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="Overdue"
            value={data.stats.overdue}
            color="bg-red-500/10"
            icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-red-500"><path d="M8 1.5L1 14h14L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 6.5v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="Due Today"
            value={data.stats.due_today}
            color="bg-amber-500/10"
            icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-amber-500"><rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2 6h12M5.5 1v2.5M10.5 1v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
          />
          <StatCard
            label="Upcoming"
            value={data.stats.upcoming}
            color="bg-emerald-500/10"
            icon={<svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-emerald-500"><path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
        </div>
      ) : null}

      {/* Lists */}
      {data && (
        <div className="space-y-4">
          {/* Only show overdue section when viewing today */}
          {data.is_today && (
            <Section
              title="Overdue"
              badge={data.overdue.length}
              badgeColor="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
              leads={data.overdue}
              isOverdue={true}
              emptyMsg="No overdue follow-ups"
              onUpdated={load}
            />
          )}
          <Section
            title={data.is_today ? "Due Today" : `Scheduled for ${new Date(data.target_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
            badge={data.scheduled.length}
            badgeColor="bg-primary/10 text-primary"
            leads={data.scheduled}
            isOverdue={false}
            emptyMsg={data.is_today ? "No follow-ups scheduled for today" : "No follow-ups scheduled for this date"}
            onUpdated={load}
          />
        </div>
      )}
    </div>
  );
}
