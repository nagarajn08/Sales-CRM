import { useEffect, useRef, useState } from "react";
import { superAdminApi, type SAUser, type SubscriptionInfo } from "../api";
import type { OrgSummary, PlatformStats } from "../types";
import { cn, fmtDate } from "../lib/utils";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";

// ── Small UI helpers ──────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1 tabular-nums", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function OrgTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      type === "corporate"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
    )}>
      {type === "corporate" ? "Corporate" : "Individual"}
    </span>
  );
}


function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", active ? "bg-emerald-500" : "bg-red-400")} />
  );
}

// ── Create Org Modal ──────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: (o: OrgSummary) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"individual" | "corporate">("corporate");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim()) { setErr("Company name is required"); return; }
    setSaving(true); setErr("");
    try {
      const org = await superAdminApi.createOrg({ name: name.trim(), type });
      onCreated(org);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Failed to create company");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="New Company" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Company Name">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Acme Corp" className={inputCls} />
        </Field>
        <Field label="Type">
          <div className="flex gap-2">
            {(["individual", "corporate"] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={cn("flex-1 py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all",
                  type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={submit}>Create Company</Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ orgs, onClose, onCreated }: {
  orgs: OrgSummary[];
  onClose: () => void;
  onCreated: (u: SAUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<"user" | "manager" | "admin">("user");
  const [orgId, setOrgId] = useState<string>(orgs[0]?.id?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) { setErr("Name, email, and password are required"); return; }
    setSaving(true); setErr("");
    try {
      const user = await superAdminApi.createUser({
        name, email, password,
        mobile: mobile || null,
        role,
        organization_id: orgId ? parseInt(orgId) : null,
      });
      onCreated(user);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Failed to create user");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="New User" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className={inputCls} />
          </Field>
          <Field label="Mobile (optional)">
            <input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 …" className={inputCls} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className={inputCls} />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Role">
            <select value={role} onChange={e => setRole(e.target.value as any)} className={inputCls}>
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Company">
            <select value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls}>
              <option value="">— No company —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={submit}>Create User</Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Manage Users Modal ────────────────────────────────────────────────────────

function ManageUsersModal({ org, orgs, onClose, onChanged }: {
  org: OrgSummary;
  orgs: OrgSummary[];
  onClose: () => void;
  onChanged: (u: SAUser) => void;
}) {
  const [users, setUsers] = useState<SAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<number | null>(null);
  const [pendingRole, setPendingRole] = useState<Record<number, string>>({});
  const [pendingOrg, setPendingOrg] = useState<Record<number, string>>({});

  useEffect(() => {
    superAdminApi.listUsers()
      .then(all => setUsers(all.filter(u => u.organization_id === org.id)))
      .finally(() => setLoading(false));
  }, [org.id]);

  const save = async (u: SAUser) => {
    setPatching(u.id);
    try {
      const newRole = pendingRole[u.id] ?? u.role;
      const newOrgStr = pendingOrg[u.id];
      const patch: { role?: string; organization_id?: number } = {};
      if (newRole !== u.role) patch.role = newRole;
      if (newOrgStr !== undefined && parseInt(newOrgStr) !== u.organization_id) patch.organization_id = parseInt(newOrgStr);
      const updated = await superAdminApi.patchUser(u.id, patch);
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      setPendingRole(p => { const n = { ...p }; delete n[u.id]; return n; });
      setPendingOrg(p => { const n = { ...p }; delete n[u.id]; return n; });
      onChanged(updated);
    } finally { setPatching(null); }
  };

  const isDirty = (u: SAUser) =>
    (pendingRole[u.id] !== undefined && pendingRole[u.id] !== u.role) ||
    (pendingOrg[u.id] !== undefined && parseInt(pendingOrg[u.id]) !== u.organization_id);

  return (
    <ModalShell title={`Users — ${org.name}`} wide onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No users in this company yet.</p>
      ) : (
        <div className="divide-y divide-border -mx-6">
          {users.map(u => (
            <div key={u.id} className="px-6 py-3 flex items-center gap-4">
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              {/* Role picker */}
              <select
                value={pendingRole[u.id] ?? u.role}
                onChange={e => setPendingRole(p => ({ ...p, [u.id]: e.target.value }))}
                className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {/* Company picker */}
              <select
                value={pendingOrg[u.id] ?? u.organization_id?.toString() ?? ""}
                onChange={e => setPendingOrg(p => ({ ...p, [u.id]: e.target.value }))}
                className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[140px]"
              >
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {/* Save */}
              <Button size="sm" variant={isDirty(u) ? "default" : "outline"}
                disabled={!isDirty(u)} loading={patching === u.id}
                onClick={() => save(u)}
                className="text-xs px-3 py-1 h-7">
                Save
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-4 border-t border-border mt-4">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </ModalShell>
  );
}

// ── Subscription Modal ────────────────────────────────────────────────────────

function SubscriptionModal({ org, onClose }: { org: OrgSummary; onClose: () => void }) {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [plan, setPlan] = useState("free");
  const [status, setStatus] = useState("active");
  const [periodEnd, setPeriodEnd] = useState("");
  const [maxLeads, setMaxLeads] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [resetCounter, setResetCounter] = useState(false);

  useEffect(() => {
    superAdminApi.getSubscription(org.id)
      .then(s => {
        setSub(s);
        setPlan(s.plan);
        setStatus(s.status);
        setPeriodEnd(s.current_period_end ? s.current_period_end.slice(0, 10) : "");
        setMaxLeads(s.max_leads_override != null ? String(s.max_leads_override) : "");
        setMaxUsers(s.max_users_override != null ? String(s.max_users_override) : "");
      })
      .finally(() => setLoading(false));
  }, [org.id]);

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const patch: Record<string, unknown> = { plan, status, reset_leads_counter: resetCounter };
      if (periodEnd) patch.current_period_end = periodEnd;
      if (maxLeads.trim() !== "") {
        const v = parseInt(maxLeads);
        if (isNaN(v) || v < 0) { setErr("Max leads must be a positive number"); setSaving(false); return; }
        patch.max_leads = v;
      }
      if (maxUsers.trim() !== "") {
        const v = parseInt(maxUsers);
        if (isNaN(v) || v < 0) { setErr("Max users must be a positive number"); setSaving(false); return; }
        patch.max_users = v;
      }
      const updated = await superAdminApi.patchSubscription(org.id, patch);
      setSub(updated);
      setResetCounter(false);
      toast.success("Subscription updated");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={`Subscription — ${org.name}`} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {sub && (
            <div className="bg-secondary/50 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p>Current plan: <span className="font-semibold text-foreground capitalize">{sub.plan}</span> · <span className="capitalize">{sub.status}</span></p>
              <p>Leads quota used: <span className="font-semibold text-foreground tabular-nums">{sub.leads_created}</span>
                {sub.max_leads_override != null ? ` / ${sub.max_leads_override} (override)` : " (using plan default)"}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select value={plan} onChange={e => setPlan(e.target.value)} className={inputCls}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>

          <Field label="Subscription Expiry Date">
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Leads Override (blank = plan default)">
              <input type="number" min={0} placeholder="e.g. 100" value={maxLeads}
                onChange={e => setMaxLeads(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Max Users Override (blank = plan default)">
              <input type="number" min={0} placeholder="e.g. 10" value={maxUsers}
                onChange={e => setMaxUsers(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <button
            onClick={() => setResetCounter(v => !v)}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all",
              resetCounter ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-border bg-secondary/30"
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">Reset leads quota counter</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sets leads_created back to 0, allowing the org to create fresh leads up to their limit</p>
            </div>
            <div className={cn("w-10 h-6 rounded-full relative shrink-0 transition-colors", resetCounter ? "bg-amber-400" : "bg-border")}>
              <div className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all", resetCounter ? "left-5" : "left-1")} />
            </div>
          </button>

          {err && <p className="text-xs text-destructive">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={save}>Save Changes</Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── User Limit Cell ───────────────────────────────────────────────────────────

function UserLimitCell({ org, onUpdated }: { org: OrgSummary; onUpdated: (o: OrgSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setVal(org.max_users != null ? String(org.max_users) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const save = async () => {
    setSaving(true);
    try {
      const max = val.trim() === "" ? null : parseInt(val);
      if (val.trim() !== "" && (isNaN(max!) || max! < 0)) {
        toast.error("Enter a valid number or leave blank to use plan limit"); return;
      }
      const updated = await superAdminApi.setUserLimit(org.id, max);
      onUpdated(updated);
      setEditing(false);
      toast.success(max == null ? "Limit cleared (plan default)" : `User limit set to ${max}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to update");
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number" min={0} placeholder="e.g. 5"
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-16 text-xs border border-ring rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
        />
        <button onClick={save} disabled={saving}
          className="text-[10px] font-semibold text-white bg-primary rounded px-1.5 py-1 hover:bg-primary/90 disabled:opacity-50">
          {saving ? "…" : "OK"}
        </button>
        <button onClick={() => setEditing(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground px-1">✕</button>
      </div>
    );
  }

  const atLimit = org.max_users != null && org.user_count >= org.max_users;
  return (
    <button onClick={open} className="flex items-center gap-1.5 group" title="Click to set user limit">
      <span className={cn(
        "text-xs font-semibold tabular-nums",
        atLimit ? "text-red-600 dark:text-red-400" : "text-foreground"
      )}>
        {org.user_count}{org.max_users != null ? `/${org.max_users}` : ""}
      </span>
      {atLimit && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Full</span>}
      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <path d="M7.5 1.5L10.5 4.5L4 11H1V8L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ── Shared modal shell ────────────────────────────────────────────────────────

function ModalShell({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn("relative bg-card border border-border rounded-xl shadow-xl p-6 w-full animate-scale-in", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full text-sm bg-secondary rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-transparent focus:border-ring/30";

// ── Plan Pricing Panel ────────────────────────────────────────────────────────

type PricingMap = Record<string, { name: string; price: number; original_price: number; discount_pct: number }>;

function PlanPricingPanel() {
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ price: 0, original_price: 0, discount_pct: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superAdminApi.getPlanPricing().then(setPricing).catch(() => toast.error("Failed to load pricing"));
  }, []);

  const openEdit = (planKey: string) => {
    if (!pricing) return;
    const p = pricing[planKey];
    setForm({ price: p.price, original_price: p.original_price, discount_pct: p.discount_pct });
    setEditing(planKey);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await superAdminApi.updatePlanPricing({ plan: editing, ...form });
      setPricing(prev => prev ? { ...prev, [editing]: { ...prev[editing], ...form } } : prev);
      toast.success("Pricing updated");
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to update");
    } finally { setSaving(false); }
  };

  if (!pricing) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ "--delay": "80ms" } as React.CSSProperties}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-primary">
            <path d="M8 1v14M3.5 4.5h7a2 2 0 010 4h-7a2.5 2.5 0 000 5H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <h2 className="text-sm font-semibold text-foreground">Plan Pricing</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Super Admin Only</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(pricing).map(([key, plan]) => (
          <div key={key} className={cn(
            "rounded-xl border p-4 transition-all",
            key === "free" ? "border-border bg-secondary/30" : "border-primary/20 bg-primary/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-foreground capitalize">{plan.name}</span>
                {key !== "free" && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Paid</span>
                )}
              </div>
              {key !== "free" && (
                <button onClick={() => openEdit(key)}
                  className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                    <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editing === key ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Price (₹/mo)</label>
                    <input type="number" min={0} value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                      className={inputCls + " text-sm"} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Original (₹)</label>
                    <input type="number" min={0} value={form.original_price}
                      onChange={e => setForm(f => ({ ...f, original_price: parseInt(e.target.value) || 0 }))}
                      className={inputCls + " text-sm"} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Discount %</label>
                  <input type="number" min={0} max={100} value={form.discount_pct}
                    onChange={e => setForm(f => ({ ...f, discount_pct: Math.min(100, parseInt(e.target.value) || 0) }))}
                    className={inputCls + " text-sm"} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" loading={saving} onClick={save}>Save</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
                  </span>
                  {plan.price > 0 && <span className="text-xs text-muted-foreground">/month</span>}
                </div>
                {plan.original_price > plan.price && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="line-through text-muted-foreground">₹{plan.original_price.toLocaleString("en-IN")}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{plan.discount_pct}% off</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── OTP Settings Panel ────────────────────────────────────────────────────────

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div className={cn("w-10 h-6 rounded-full transition-colors relative flex-shrink-0", on ? "bg-primary" : "bg-border")}>
      <div className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-5" : "left-1")} />
    </div>
  );
}

function OTPSettingsPanel() {
  const [emailOn, setEmailOn] = useState(true);
  const [mobileOn, setMobileOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    superAdminApi.getOtpSettings()
      .then(cfg => { setEmailOn(cfg.email_otp_enabled); setMobileOn(cfg.mobile_otp_enabled); setLoaded(true); })
      .catch(() => toast.error("Failed to load OTP settings"));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateOtpSettings({ email_otp_enabled: emailOn, mobile_otp_enabled: mobileOn });
      toast.success("OTP settings saved");
    } catch {
      toast.error("Failed to save OTP settings");
    } finally { setSaving(false); }
  };

  if (!loaded) return null;

  const channels = [
    { key: "email", label: "Email OTP", desc: "Require email verification on signup", value: emailOn, toggle: () => setEmailOn(v => !v) },
    { key: "mobile", label: "Mobile OTP", desc: "Require mobile verification via Fast2SMS", value: mobileOn, toggle: () => setMobileOn(v => !v) },
  ];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-up" style={{ "--delay": "100ms" } as React.CSSProperties}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-primary">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <h2 className="text-sm font-semibold text-foreground">OTP Verification</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Super Admin Only</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">Disable channels temporarily while configuring SMTP or SMS.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {channels.map(ch => (
            <button key={ch.key} onClick={ch.toggle}
              className={cn(
                "flex-1 flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                ch.value ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/30"
              )}>
              <div>
                <p className="text-sm font-medium text-foreground">{ch.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ch.desc}</p>
                <span className={cn("mt-1.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  ch.value ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                           : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400")}>
                  {ch.value ? "Enabled" : "Disabled"}
                </span>
              </div>
              <ToggleSwitch on={ch.value} />
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" loading={saving} onClick={save}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "individual" | "corporate">("all");

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [manageOrg, setManageOrg] = useState<OrgSummary | null>(null);
  const [subOrg, setSubOrg] = useState<OrgSummary | null>(null);

  const reload = () =>
    Promise.all([superAdminApi.stats(), superAdminApi.listOrgs()])
      .then(([s, o]) => { setStats(s); setOrgs(o); });

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const handleToggle = async (org: OrgSummary) => {
    setToggling(org.id);
    try {
      const updated = await superAdminApi.toggleOrg(org.id);
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: updated.is_active } : o));
    } finally { setToggling(null); }
  };

  const filtered = orgs.filter(o => {
    const matchSearch = !search
      || o.name.toLowerCase().includes(search.toLowerCase())
      || (o.owner_email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.type === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-foreground">Platform Admin</h1>
            <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">Super Admin</span>
          </div>
          <p className="text-sm text-muted-foreground">Manage all organizations and users across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreateUser(true)}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 mr-1.5">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M12 1v4M10 3h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            New User
          </Button>
          <Button size="sm" onClick={() => setShowCreateOrg(true)}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 mr-1.5">
              <rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M5 4V3a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M8 8v4M6 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            New Company
          </Button>
        </div>
      </div>

      {/* Platform stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ "--delay": "50ms" } as React.CSSProperties}>
          <StatTile label="Total Organizations" value={stats.total_orgs}
            sub={`${stats.individual_orgs} individual · ${stats.corporate_orgs} corporate`}
            color="text-foreground" />
          <StatTile label="Total Users" value={stats.total_users} color="text-foreground" />
          <StatTile label="Total Leads" value={stats.total_leads}
            sub={`${stats.active_leads} active`} color="text-foreground" />
          <StatTile label="Converted Today" value={stats.converted_today} color="text-emerald-600" />
        </div>
      )}

      {/* Plan pricing — super admin only */}
      <PlanPricingPanel />

      {/* OTP settings — super admin only */}
      <OTPSettingsPanel />

      {/* Orgs table */}
      <div className="animate-fade-up bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        style={{ "--delay": "120ms" } as React.CSSProperties}>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4 border-b border-border">
          <input
            type="text"
            placeholder="Search by name or owner email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm bg-secondary rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-transparent"
          />
          <div className="flex gap-1 p-1 bg-secondary rounded-lg shrink-0">
            {(["all", "individual", "corporate"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                  filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Owner</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Users / Limit</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Leads</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Active</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Converted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Joined</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    No organizations found
                  </td>
                </tr>
              ) : (
                filtered.map(org => (
                  <tr key={org.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot active={org.is_active} />
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground">ID #{org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><OrgTypeBadge type={org.type} /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-foreground">{org.owner_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{org.owner_email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex justify-center">
                        <UserLimitCell org={org} onUpdated={updated => setOrgs(prev => prev.map(o => o.id === updated.id ? updated : o))} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums hidden lg:table-cell text-foreground">{org.lead_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums hidden lg:table-cell text-foreground">{org.active_lead_count}</td>
                    <td className="px-4 py-3 text-center tabular-nums hidden xl:table-cell text-emerald-600 font-medium">{org.converted_count}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{fmtDate(org.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => setManageOrg(org)}
                          className="text-xs font-medium px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          Users
                        </button>
                        <button
                          onClick={() => setSubOrg(org)}
                          className="text-xs font-medium px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-violet-400/60 transition-colors"
                        >
                          Subscription
                        </button>
                        <button
                          onClick={() => handleToggle(org)}
                          disabled={toggling === org.id}
                          className={cn(
                            "text-xs font-medium px-3 py-1 rounded-full transition-colors border",
                            org.is_active
                              ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20",
                            toggling === org.id && "opacity-50 pointer-events-none"
                          )}
                        >
                          {toggling === org.id ? "…" : org.is_active ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onCreated={(org) => { setOrgs(prev => [org, ...prev]); setShowCreateOrg(false); reload(); }}
        />
      )}

      {showCreateUser && (
        <CreateUserModal
          orgs={orgs}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => { setShowCreateUser(false); reload(); }}
        />
      )}

      {manageOrg && (
        <ManageUsersModal
          org={manageOrg}
          orgs={orgs}
          onClose={() => setManageOrg(null)}
          onChanged={() => reload()}
        />
      )}

      {subOrg && (
        <SubscriptionModal
          org={subOrg}
          onClose={() => setSubOrg(null)}
        />
      )}
    </div>
  );
}
