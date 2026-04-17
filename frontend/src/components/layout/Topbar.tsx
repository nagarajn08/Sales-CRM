import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { NotificationPanel } from "./NotificationPanel";
import { useTheme } from "../../hooks/useTheme";

interface TopbarProps {
  onMenuClick: () => void;
}

const PAGE_META: Record<string, { title: string; sub: string; icon: React.ReactNode }> = {
  "/dashboard": {
    title: "Dashboard",
    sub: "Your pipeline at a glance",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="9.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
      </svg>
    ),
  },
  "/leads": {
    title: "Leads",
    sub: "Manage & track your pipeline",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 14.5c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
        <circle cx="11.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M8.5 14.5c0-2.76 1.79-5 4-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  "/templates": {
    title: "Email Templates",
    sub: "Reusable email templates",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="1.5" y="3" width="13" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 6l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  "/reports": {
    title: "Reports",
    sub: "Pipeline analytics & performance",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <path d="M2 12.5V4.5M5.5 12.5V7.5M9 12.5V5.5M12.5 12.5V2.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
        <path d="M1 14h14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  "/users": {
    title: "Team",
    sub: "Manage team members",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <circle cx="8" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M2 14.5c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  "/settings": {
    title: "Settings",
    sub: "App & integration configuration",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  "/billing": {
    title: "Billing & Plans",
    sub: "Manage your subscription",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 6.5h13M4 10h2M9 10h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  "/platform": {
    title: "Platform Admin",
    sub: "Organisation management",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
        <rect x="1" y="1" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M5 15h6M8 11v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme(user?.id);
  const isDark = theme.dark;

  const pathKey = "/" + location.pathname.split("/")[1];
  const page = PAGE_META[pathKey];
  const isLeadDetail = location.pathname.startsWith("/leads/") && location.pathname !== "/leads";

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-[58px] flex items-center gap-3 px-4 lg:px-5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path d="M2 4.5h12M2 8h8M2 11.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Page title */}
      <div className="hidden lg:flex items-center gap-2.5 min-w-0">
        {isLeadDetail ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/leads")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Leads
            </button>
            <span className="text-border text-xs">/</span>
            <span className="text-sm font-semibold text-foreground">Detail</span>
          </div>
        ) : page ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              {page.icon}
            </div>
            <div>
              <p className="font-display font-bold text-foreground text-[14px] leading-none tracking-tight">{page.title}</p>
              {page.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{page.sub}</p>}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">

        {/* Dark / Light toggle */}
        <button
          onClick={() => setTheme({ dark: !isDark })}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {isDark ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M12.6 3.4l-.7.7M4.1 11.9l-.7.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M13.5 10A6 6 0 116 2.5a4.5 4.5 0 007.5 7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <NotificationPanel />

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1" />

        {/* User area */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))" }}
          >
            {initials}
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10.5 11l3-3-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}
