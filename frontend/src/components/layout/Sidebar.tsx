import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="9.5" y="1.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="1.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
      </svg>
    ),
  },
  {
    to: "/leads",
    label: "Leads",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 14.5c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
        <circle cx="11.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M8.5 14.5c0-2.76 1.79-5 4-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: "/templates",
    label: "Email Templates",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <rect x="1.5" y="3" width="13" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 6l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const ADMIN_ITEMS = [
  {
    to: "/users",
    label: "Team",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <circle cx="8" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M2 14.5c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[220px] flex flex-col transition-transform duration-300 ease-out lg:relative lg:translate-x-0",
          "bg-sidebar border-r border-sidebar-border",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + Org name */}
        <div className="flex items-start gap-2.5 px-4 pt-4 pb-3.5 border-b border-sidebar-border shrink-0">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-sidebar-accent/20 border border-sidebar-accent/30 shrink-0 mt-0.5">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-sidebar-accent">
              <path d="M8 2C4.68 2 2 4.68 2 8s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6z" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-sidebar" />
          </div>
          <div className="min-w-0 flex-1">
            {user?.org_name ? (
              <>
                <p className="font-display font-bold text-sidebar-foreground text-sm leading-tight tracking-tight truncate">
                  {user.org_name}
                </p>
                <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-sidebar-accent/60" />
                  SalesCRM · {user.org_type === "individual" ? "Individual" : "Business"}
                </p>
              </>
            ) : (
              <>
                <p className="font-display font-bold text-sidebar-foreground text-sm leading-none tracking-tight">SalesCRM</p>
                <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium">Sales Intelligence</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-sidebar-muted hover:text-sidebar-foreground transition-colors rounded-md hover:bg-white/5 shrink-0"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => cn(
                "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative",
                isActive
                  ? "bg-sidebar-accent/10 text-sidebar-foreground nav-active-glow"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/5"
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Superadmin section */}
          {user?.is_superadmin && (
            <>
              <div className="pt-5 pb-1.5 px-3">
                <p className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-[0.1em]">Platform</p>
              </div>
              <NavLink
                to="/platform"
                onClick={onClose}
                className={({ isActive }) => cn(
                  "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative",
                  isActive
                    ? "bg-sidebar-accent/10 text-sidebar-foreground nav-active-glow"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/5"
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn("shrink-0 transition-colors", isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground")}>
                      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
                        <rect x="1" y="1" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
                        <path d="M5 15h6M8 11v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span>Platform Admin</span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-accent" />}
                  </>
                )}
              </NavLink>
            </>
          )}

          {/* Admin section */}
          {user?.role === "admin" && (
            <>
              <div className="pt-5 pb-1.5 px-3">
                <p className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-[0.1em]">Admin</p>
              </div>
              {ADMIN_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative",
                    isActive
                      ? "bg-white/[0.08] text-sidebar-foreground nav-active-glow"
                      : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/5"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn("shrink-0 transition-colors", isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground")}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-accent" />}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-2.5 py-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent/5 transition-colors cursor-default">
            <div className="relative shrink-0">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-accent) / 0.9), hsl(var(--sidebar-accent) / 0.5))" }}
              >
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-sidebar" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-sidebar-muted capitalize mt-px">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
