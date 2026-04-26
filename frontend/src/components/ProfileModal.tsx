import { useState } from "react";
import { Modal } from "./ui/modal";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { authApi } from "../api";
import { useAuth } from "../auth/AuthContext";
import { digitsOnly, isValidMobile, isValidPassword } from "../lib/validators";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "password";

export function ProfileModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

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

  const handleOpen = () => {
    setName(user?.name ?? "");
    setMobile(user?.mobile ?? "");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwError("");
    setTab("profile");
  };

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

  // Reset form when modal opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) { handleOpen(); setPrevOpen(true); }
  if (!open && prevOpen) { setPrevOpen(false); }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="My Profile"
      maxWidth="max-w-sm"
    >
      {/* Tab switcher */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-4">
        {(["profile", "password"] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "profile" ? "Edit Profile" : "Change Password"}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-semibold text-foreground capitalize">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
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
    </Modal>
  );
}
