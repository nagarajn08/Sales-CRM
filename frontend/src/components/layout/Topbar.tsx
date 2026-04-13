import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { NotificationPanel } from "./NotificationPanel";
import { Button } from "../ui/button";

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
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        ☰
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <NotificationPanel />

      <div className="flex items-center gap-2 pl-2 border-l border-border">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          Sign out
        </Button>
      </div>
    </header>
  );
}
