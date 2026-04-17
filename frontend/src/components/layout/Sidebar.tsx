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

function NavItem({ to, label, icon, onClose }: { to: string; label: string; icon: React.ReactNode; onClose: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150",
        isActive
          ? "bg-sidebar-accent/12 text-sidebar-foreground"
          : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-white/[0.04]"
      )}
    >
      {({ isActive }) => (
        <>
          {/* left accent bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-sidebar-accent" />
          )}
          <span className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-sidebar-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground"
          )}>
            {icon}
          </span>
          <span className="truncate">{label}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-accent shrink-0" />
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1.5 px-3">
      <div className="h-px flex-1 bg-sidebar-border/60" />
      <p className="text-[9.5px] font-bold text-sidebar-muted/70 uppercase tracking-[0.12em] shrink-0">{children}</p>
      <div className="h-px flex-1 bg-sidebar-border/60" />
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-[218px] flex flex-col transition-transform duration-300 ease-out lg:relative lg:translate-x-0",
        "bg-sidebar border-r border-sidebar-border",
        open ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* ── Brand / Org ── */}
        <div className="flex items-center gap-2.5 px-4 h-[58px] border-b border-sidebar-border shrink-0">
          {/* App icon */}
          <div className="relative flex items-center justify-center h-8 w-8 rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-accent) / 0.9) 0%, hsl(var(--sidebar-accent) / 0.5) 100%)" }}>
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-white">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 2.5V1M8 15v-1.5M2.5 8H1M15 8h-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-sidebar" />
          </div>

          {/* Name block */}
          <div className="min-w-0 flex-1">
            {user?.org_name ? (
              <>
                <p className="font-display font-bold text-sidebar-foreground text-[13px] leading-tight tracking-tight truncate">
                  {user.org_name}
                </p>
                <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium truncate">
                  SalesCRM · {user.org_type === "individual" ? "Individual" : "Business"}
                </p>
              </>
            ) : (
              <>
                <p className="font-display font-bold text-sidebar-foreground text-[13px] leading-tight tracking-tight">SalesCRM</p>
                <p className="text-[10px] text-sidebar-muted mt-0.5 font-medium">Sales Intelligence</p>
              </>
            )}
          </div>

          {/* Mobile close */}
          <button onClick={onClose} className="lg:hidden p-1.5 text-sidebar-muted hover:text-sidebar-foreground transition-colors rounded-md hover:bg-white/5 shrink-0">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">

          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} onClose={onClose} />
          ))}

          {/* Superadmin */}
          {user?.is_superadmin && (
            <>
              <SectionLabel>Platform</SectionLabel>
              <NavItem
                to="/platform"
                label="Platform Admin"
                onClose={onClose}
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
              <SectionLabel>Admin</SectionLabel>
              {ADMIN_ITEMS
                .filter(item => item.to !== "/billing" || !user?.is_superadmin)
                .map(item => (
                  <NavItem key={item.to} {...item} onClose={onClose} />
                ))}
            </>
          )}
        </nav>

        {/* ── User footer ── */}
        <div className="px-2.5 pb-3 pt-2 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.03] border border-sidebar-border/50">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-accent) / 0.9), hsl(var(--sidebar-accent) / 0.5))" }}
              >
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border-2 border-sidebar" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight capitalize">{user?.name}</p>
              <p className="text-[10px] text-sidebar-muted capitalize mt-px">{user?.role}</p>
            </div>

            {/* Online dot */}
            <div className="shrink-0 flex flex-col items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
