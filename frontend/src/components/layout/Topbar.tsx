import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { NotificationPanel } from "./NotificationPanel";
import { useTheme } from "../../hooks/useTheme";

interface TopbarProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, { title: string; sub?: string }> = {
  "/dashboard":  { title: "Dashboard", sub: "Your pipeline at a glance" },
  "/leads":      { title: "Leads", sub: "Manage & track your pipeline" },
  "/templates":  { title: "Email Templates", sub: "Your saved email templates" },
  "/users":      { title: "Team", sub: "Manage team members" },
  "/settings":   { title: "Settings", sub: "App & integration settings" },
  "/platform":   { title: "Platform Admin", sub: "Organisation management" },
};

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M12.6 3.4l-.7.7M4.1 11.9l-.7.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <path d="M13.5 10A6 6 0 116 2.5a4.5 4.5 0 007.5 7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme(user?.id);
  const isDark = theme.dark;
  const toggle = () => setTheme({ dark: !theme.dark });

  const pathKey = "/" + location.pathname.split("/")[1];
  const page = PAGE_TITLES[pathKey];
  const isLeadDetail = location.pathname.startsWith("/leads/") && location.pathname !== "/leads";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-[58px] flex items-center gap-3 px-4 lg:px-6 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path d="M2 4.5h12M2 8h8M2 11.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Page title (desktop) */}
      <div className="hidden lg:block min-w-0">
        {isLeadDetail ? (
          <p className="text-sm font-semibold text-foreground">Lead Detail</p>
        ) : page ? (
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-foreground text-[15px] leading-none">{page.title}</p>
            {page.sub && (
              <>
                <span className="text-border">·</span>
                <p className="text-xs text-muted-foreground">{page.sub}</p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <NotificationPanel />

        <div className="h-4 w-px bg-border mx-1" />

        {/* User menu */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-[13px] font-semibold text-foreground leading-tight">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground capitalize leading-tight">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10.5 11l3-3-3-3M13.5 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
