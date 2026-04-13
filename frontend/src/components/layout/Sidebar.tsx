import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/leads", label: "Leads", icon: "👥" },
  { to: "/templates", label: "Email Templates", icon: "✉️" },
];

const ADMIN_ITEMS = [
  { to: "/users", label: "Users", icon: "👤" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        <span className="text-2xl">🚀</span>
        <span className="font-bold text-foreground text-base">SalesCRM</span>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
