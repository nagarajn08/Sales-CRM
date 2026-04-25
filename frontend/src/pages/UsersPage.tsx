import { useEffect, useState } from "react";
import { usersApi, billingApi, type UserSession } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { User, UserRole } from "../types";
import { isValidEmail, isValidMobile, isValidPassword, digitsOnly, capitalizeName } from "../lib/validators";
import { Button } from "../components/ui/button";
import { fmtDateTime } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { cn } from "../lib/utils";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  user: "bg-gray-100 text-gray-600",
};

interface UserFormState {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

const emptyForm = (): UserFormState => ({ name: "", email: "", mobile: "", password: "", role: "user", is_active: true });

type Tab = "users" | "sessions";

function fmtDuration(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.is_superadmin;
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ current: number; max: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    usersApi.list().then(setUsers).finally(() => setLoading(false));
  };

  const fetchUsage = () => {
    if (!isSuperAdmin) billingApi.get().then(d => setUsage(d.users)).catch(() => {});
  };

  const fetchSessions = () => {
    setSessionsLoading(true);
    usersApi.sessions().then(s => { setSessions(s); setSessionsLoaded(true); }).finally(() => setSessionsLoading(false));
  };

  useEffect(() => { fetchUsers(); fetchUsage(); }, []);

  useEffect(() => {
    if (tab === "sessions" && !sessionsLoaded) fetchSessions();
  }, [tab]);

  const openAdd = () => { setEditUser(null); setForm(emptyForm()); setErrors({}); setShowForm(true); };
  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, mobile: u.mobile ?? "", password: "", role: u.role, is_active: u.is_active });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!isValidEmail(form.email)) e.email = "Enter a valid email address";
    if (form.mobile.trim() && !isValidMobile(form.mobile)) e.mobile = "Mobile must be a 10-digit number";
    if (!editUser && !form.password.trim()) e.password = "Password is required for new users";
    else if (form.password.trim() && !isValidPassword(form.password))
      e.password = "Min 8 chars, 1 uppercase, 1 number";
    return e;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim() || null,
        role: form.role,
        is_active: form.is_active,
      };
      if (form.password.trim()) payload.password = form.password.trim();

      if (editUser) {
        const updated = await usersApi.update(editUser.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await usersApi.create(payload);
        setUsers((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrors({ _: msg ?? "Failed to save user" });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const f = (field: keyof UserFormState, val: unknown) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} {isSuperAdmin ? "accounts across all organizations" : "accounts"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
            {(["users", "sessions"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "sessions" ? "Login Logs" : "Users"}
              </button>
            ))}
          </div>
          {!isSuperAdmin && tab === "users" && <Button onClick={openAdd}>+ Add User</Button>}
        </div>
      </div>

      {/* Usage banner — only when a limit is set */}
      {usage && usage.max !== -1 && !isSuperAdmin && (
        <div className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl border text-sm",
          usage.current >= usage.max
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : usage.current >= usage.max * 0.8
            ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-border bg-secondary/30"
        )}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn(
                "text-xs font-semibold",
                usage.current >= usage.max ? "text-red-700 dark:text-red-400"
                  : usage.current >= usage.max * 0.8 ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground"
              )}>
                {usage.current} of {usage.max} users used
                {usage.current >= usage.max
                  ? " — limit reached"
                  : ` · ${usage.max - usage.current} slot${usage.max - usage.current !== 1 ? "s" : ""} remaining`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  usage.current >= usage.max ? "bg-red-500"
                    : usage.current >= usage.max * 0.8 ? "bg-amber-500"
                    : "bg-primary"
                )}
                style={{ width: `${Math.min((usage.current / usage.max) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Login / Logout Logs</p>
            <button onClick={fetchSessions} className="text-xs text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-secondary transition-colors font-medium">
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5"><path d="M2 8a6 6 0 1 0 .75-2.9M2 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Refresh
            </button>
          </div>
          {sessionsLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No login activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <th className="text-left px-5 py-3">User</th>
                    {isSuperAdmin && <th className="text-left px-4 py-3 hidden md:table-cell">Organisation</th>}
                    <th className="text-left px-4 py-3">Login Time</th>
                    <th className="text-left px-4 py-3">Logout Time</th>
                    <th className="text-left px-4 py-3">Duration</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">IP Address</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground text-sm">{s.user_name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.user_email}</p>
                      </td>
                      {isSuperAdmin && <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{s.org_name ?? "—"}</td>}
                      <td className="px-4 py-3 text-sm text-foreground tabular-nums">{fmtDateTime(s.login_at)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">
                        {s.logout_at ? (
                          <span className="text-foreground">{fmtDateTime(s.logout_at)}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Active now</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{fmtDuration(s.duration_minutes)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell font-mono">{s.ip_address ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {s.logout_at ? (
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Ended</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "users" && loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tab === "users" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Company</th>
                  {isSuperAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Org ID</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Last Login</th>
                  {!isSuperAdmin && <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">{u.name}</p>
                          {u.is_owner && <span className="text-[10px] text-muted-foreground">Admin / Incharge</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {u.org_name ?? "—"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs font-data">
                        #{u.organization_id ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {u.last_login ? fmtDateTime(u.last_login) : "Never"}
                    </td>
                    {!isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>Delete</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* User Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editUser ? "Edit User" : "Add User"}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={(e) => f("name", capitalizeName(e.target.value))} required error={errors.name} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => f("email", e.target.value)} required error={errors.email} />
          <Input label="Mobile" type="tel" inputMode="numeric" value={form.mobile} onChange={(e) => f("mobile", digitsOnly(e.target.value))} placeholder="9876543210" error={errors.mobile} />
          <Input
            label={editUser ? "New Password (leave blank to keep)" : "Password"}
            type="password"
            value={form.password}
            onChange={(e) => f("password", e.target.value)}
            required={!editUser}
            error={errors.password}
          />
          <Select label="Role" value={form.role} onChange={(e) => f("role", e.target.value as UserRole)} options={ROLE_OPTIONS} />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input type="checkbox" checked={form.is_active} onChange={(e) => f("is_active", e.target.checked)} className="rounded" />
            Active account
          </label>
          {errors._ && <p className="text-sm text-destructive">{errors._}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editUser ? "Save Changes" : "Create User"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User?" maxWidth="max-w-sm">
        <p className="text-sm text-muted-foreground mb-5">
          Delete <strong className="text-foreground">{deleteTarget?.name}</strong>? Their leads will remain but become unassigned.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" loading={deleting} onClick={deleteUser}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
