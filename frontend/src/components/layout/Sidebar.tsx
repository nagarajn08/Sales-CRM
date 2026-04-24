import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
        <path d="M8.5 14.5c0-1.97 1.1-3.7 2.75-4.55" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: "/followups",
    label: "Follow-ups",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M8 4.5V8l2 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <path d="M2 12.5V4.5M5.5 12.5V7.5M9 12.5V5.5M12.5 12.5V2.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
        <path d="M1 14h14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
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
    to: "/billing",
    label: "Billing & Plans",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35"/>
        <path d="M4 10h2M9 10h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
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

function NavItem({
  to, label, icon, onClose, collapsed,
}: {
  to: string; label: string; icon: React.ReactNode; onClose: () => void; collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-150",
        collapsed ? "px-0 py-2 justify-center" : "px-3 py-2",
        isActive
          ? "bg-sidebar-accent/12 text-sidebar-foreground"
          : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.04]"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-sidebar-accent" />
          )}
          <span className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
          )}>
            {icon}
          </span>
          {!collapsed && <span className="truncate">{label}</span>}
          {isActive && !collapsed && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-accent shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-2 h-px bg-sidebar-border/60" />;
  }
  return (
    <div className="flex items-center gap-2 pt-4 pb-1.5 px-3">
      <div className="h-px flex-1 bg-sidebar-border/60" />
      <p className="text-[9.5px] font-bold text-sidebar-muted/70 uppercase tracking-[0.12em] shrink-0">{children}</p>
      <div className="h-px flex-1 bg-sidebar-border/60" />
    </div>
  );
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-out lg:relative lg:translate-x-0",
        "bg-sidebar border-r border-sidebar-border",
        open ? "translate-x-0" : "-translate-x-full",
        collapsed ? "w-16" : "w-[218px]"
      )}>

        {/* ── Brand / Org ── */}
        <div className={cn(
          "flex items-center h-[58px] border-b border-sidebar-border shrink-0",
          collapsed ? "px-0 justify-center" : "gap-2.5 px-4"
        )}>
          {/* App icon */}
          <div className="relative flex items-center justify-center h-8 w-8 rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-accent) / 0.9) 0%, hsl(var(--sidebar-accent) / 0.5) 100%)" }}>
            {/* Pin + sparkline mark */}
            <svg viewBox="0 0 24 30" fill="none" className="h-5 w-4">
              <path d="M12 1 A9 9 0 0 1 21 10 C21 17 13 25 12 27 C11 25 3 17 3 10 A9 9 0 0 1 12 1 Z"
                    fill="white" fillOpacity="0.92"/>
              <path d="M8.5 13 L12 10 L15.5 7"
                    stroke="hsl(var(--sidebar-accent))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="13" r="1.8" fill="hsl(var(--sidebar-accent))"/>
              <circle cx="12"  cy="10" r="1.8" fill="hsl(var(--sidebar-accent))"/>
              <circle cx="15.5" cy="7"  r="1.8" fill="hsl(var(--sidebar-accent))"/>
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-sidebar" />
          </div>

          {/* Name block — hidden when collapsed */}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              {user?.org_name ? (
                <>
                  <p className="font-display font-bold text-sidebar-foreground text-[13px] leading-tight tracking-tight truncate">
                    {user.org_name}
                  </p>
                  <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium truncate">
                    TrackmyLead · {user.org_type === "individual" ? "Individual" : "Business"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display font-bold text-sidebar-foreground text-[13px] leading-tight tracking-tight">TrackmyLead</p>
                  <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium">Sales Intelligence</p>
                </>
              )}
            </div>
          )}

          {/* Mobile close */}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden p-1.5 text-sidebar-muted hover:text-sidebar-foreground transition-colors rounded-md hover:bg-white/5 shrink-0">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className={cn("flex-1 py-3 space-y-0.5 overflow-y-auto", collapsed ? "px-1.5" : "px-2.5")}>

          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
          ))}

          {/* Superadmin */}
          {user?.is_superadmin && (
            <>
              <SectionLabel collapsed={collapsed}>Platform</SectionLabel>
              <NavItem
                to="/platform"
                label="Platform Admin"
                onClose={onClose}
                collapsed={collapsed}
                icon={
                  <svg viewBox="0 0 16 16" fill="none" className="h-[15px] w-[15px]">
                    <rect x="1" y="1" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.35"/>
                    <path d="M5 15h6M8 11v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                  </svg>
                }
              />
            </>
          )}

          {/* Admin */}
          {user?.role === "admin" && (
            <>
              <SectionLabel collapsed={collapsed}>Admin</SectionLabel>
              {ADMIN_ITEMS
                .filter(item => item.to !== "/billing" || !user?.is_superadmin)
                .map(item => (
                  <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
                ))}
            </>
          )}
        </nav>

        {/* ── User footer ── */}
        <div className={cn("pb-3 pt-2 border-t border-sidebar-border shrink-0", collapsed ? "px-1.5" : "px-2.5")}>
          <div className={cn(
            "flex items-center rounded-xl bg-white/[0.03] border border-sidebar-border/50",
            collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-2"
          )}>
            {/* Avatar */}
            <div className="relative shrink-0" title={collapsed ? `${user?.name} · ${user?.role}` : undefined}>
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-accent) / 0.9), hsl(var(--sidebar-accent) / 0.5))" }}
              >
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-sidebar" />
            </div>

            {/* Info — hidden when collapsed */}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight capitalize">{user?.name}</p>
                <p className="text-[10px] text-sidebar-muted capitalize mt-px">{user?.role}</p>
              </div>
            )}

            {/* Online dot — only in expanded */}
            {!collapsed && (
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
            )}
          </div>
        </div>

        {/* ── Collapse toggle (desktop only) ── */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex items-center justify-center h-8 w-8 mx-auto mb-3 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.06] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className={cn("h-3.5 w-3.5 transition-transform", collapsed ? "rotate-180" : "")}>
            <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

      </aside>
    </>
  );
}
