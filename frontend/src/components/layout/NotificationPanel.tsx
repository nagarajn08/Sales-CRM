import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../../api";
import type { Notification } from "../../types";
import { cn } from "../../lib/utils";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchCount = async () => {
    try {
      const { count } = await notificationsApi.unreadCount();
      setUnread(count);
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchAll();
  }, [open]);

  // close on outside click
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        🔔
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-destructive text-white rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-secondary transition-colors",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <p className={cn("text-sm text-foreground", !n.is_read && "font-medium")}>
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
