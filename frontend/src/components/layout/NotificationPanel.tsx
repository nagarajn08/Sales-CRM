import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../../api";
import type { Notification } from "../../types";
import { cn, fmtDateTime } from "../../lib/utils";

// ── Bell tone via Web Audio API (no external file needed) ─────────────────
function playBell() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Two-tone bell: strike + resonance
    const frequencies = [880, 1108]; // A5 + C#6
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 1.2);

      const vol = i === 0 ? 0.25 : 0.15;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.start(now + i * 0.04);
      osc.stop(now + 2);
    });

    // Auto-close context after the sound finishes
    setTimeout(() => ctx.close(), 2500);
  } catch {
    // AudioContext blocked (no user interaction yet) — ignore silently
  }
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const prevUnread = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchCount = async () => {
    try {
      const { count } = await notificationsApi.unreadCount();
      setUnread((prev) => {
        if (count > prev) {
          playBell();
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
        }
        prevUnread.current = count;
        return count;
      });
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch {}
  };

  // Poll every 30 seconds for timely minute-level reminders
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchAll();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (n: Notification) => {
    if (!n.is_read) {
      await notificationsApi.markRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.lead_id) {
      navigate(`/leads/${n.lead_id}`);
      setOpen(false);
    }
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors",
          open ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          pulse && "animate-pulse"
        )}
        aria-label="Notifications"
      >
        {/* SVG bell icon */}
        <svg viewBox="0 0 20 20" fill="none" className={cn("h-5 w-5 transition-transform", pulse && "scale-110")}>
          <path
            d="M10 2a6 6 0 00-6 6v2.5L2.5 13h15L16 10.5V8a6 6 0 00-6-6z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
            fill={unread > 0 ? "currentColor" : "none"}
            fillOpacity={unread > 0 ? 0.15 : 0}
          />
          <path d="M8 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 flex items-center justify-center",
            "text-[10px] font-bold bg-destructive text-white rounded-full",
            pulse && "scale-125 transition-transform"
          )}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <svg viewBox="0 0 20 20" fill="none" className="h-8 w-8 mb-2 opacity-20">
                  <path d="M10 2a6 6 0 00-6 6v2.5L2.5 13h15L16 10.5V8a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 15a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p className="text-sm">All clear!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-secondary/60 transition-colors group",
                    !n.is_read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0">{n.is_read ? "🔔" : "🔔"}</span>
                    <div className="min-w-0">
                      <p className={cn("text-sm text-foreground leading-snug", !n.is_read && "font-medium")}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {fmtDateTime(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
