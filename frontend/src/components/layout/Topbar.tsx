import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="flex-1" />

      <NotificationPanel />

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-2.5">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-foreground leading-tight">{user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-secondary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
