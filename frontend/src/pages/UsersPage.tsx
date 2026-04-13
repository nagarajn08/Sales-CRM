import { useEffect, useState } from "react";
import { usersApi } from "../api";
import type { User, UserRole } from "../types";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(fetchUsers, []);

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
    if (!editUser && !form.password.trim()) e.password = "Password is required for new users";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} accounts</p>
        </div>
        <Button onClick={openAdd}>+ Add User</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
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
                        <span className="font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>Delete</Button>
                      </div>
                    </td>
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
          <Input label="Full Name" value={form.name} onChange={(e) => f("name", e.target.value)} required error={errors.name} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => f("email", e.target.value)} required error={errors.email} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => f("mobile", e.target.value)} />
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
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-foreground mb-2">Delete User?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Delete <strong>{deleteTarget.name}</strong>? Their leads will remain but become unassigned.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={deleteUser}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
