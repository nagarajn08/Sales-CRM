import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { authApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { digitsOnly, isValidMobile, isValidPassword } from "../lib/validators";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "password";

export function ProfileModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const panelRef = useRef<HTMLDivElement>(null);

  // Profile fields
  const [name, setName] = useState(user?.name ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  // Reset form when opened
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setName(user?.name ?? "");
    setMobile(user?.mobile ?? "");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwError("");
    setTab("profile");
    setPrevOpen(true);
  }
  if (!open && prevOpen) setPrevOpen(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mobile && !isValidMobile(mobile)) {
      toast.error("Mobile must be a 10-digit number");
      return;
    }
    setSavingProfile(true);
    try {
      await authApi.updateMe({ name: name.trim(), mobile: mobile || undefined });
      await refreshUser();
      toast.success("Profile updated");
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password"); return; }
    if (!isValidPassword(newPw)) { setPwError("Min 8 chars, 1 uppercase, 1 number"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setSavingPw(true);
    try {
      await authApi.updateMe({ current_password: currentPw, new_password: newPw });
      toast.success("Password changed — please log in again");
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwError(msg ?? "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.6))" }}
          >
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground capitalize leading-tight">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-secondary/60 m-3 rounded-lg p-1">
        {(["profile", "password"] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "profile" ? "Edit Profile" : "Change Password"}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4">
        {tab === "profile" ? (
          <form onSubmit={saveProfile} className="space-y-3">
            <Input
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Mobile"
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={e => setMobile(digitsOnly(e.target.value))}
              placeholder="9876543210"
            />
            <Input
              label="Email"
              value={user?.email ?? ""}
              disabled
              helpText="Email cannot be changed"
            />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" loading={savingProfile}>Save</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={savePassword} className="space-y-3">
            <Input
              label="Current Password"
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              helpText="Min 8 chars, 1 uppercase, 1 number"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
            />
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" loading={savingPw}>Change Password</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
