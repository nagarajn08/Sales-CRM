import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Input, Select, Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi, usersApi } from "../../api";
import type { Lead, User } from "../../types";
import { useAuth } from "../../auth/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null; // null = create mode
  onSaved: (lead: Lead) => void;
}

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
  { value: "website", label: "Website" },
  { value: "reference", label: "Reference" },
  { value: "cold_call", label: "Cold Call" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "hot", label: "🔴 Hot" },
  { value: "warm", label: "🟡 Warm" },
  { value: "cold", label: "🔵 Cold" },
];

export function LeadFormModal({ open, onClose, lead, onSaved }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    web_id: "",
    name: "",
    email: "",
    mobile: "",
    whatsapp: "",
    company: "",
    notes: "",
    priority: "warm",
    source: "manual",
    assigned_to_id: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      usersApi.list().then(setUsers).catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (lead) {
      setForm({
        web_id: lead.web_id ?? "",
        name: lead.name,
        email: lead.email ?? "",
        mobile: lead.mobile ?? "",
        whatsapp: lead.whatsapp ?? "",
        company: lead.company ?? "",
        notes: lead.notes ?? "",
        priority: lead.priority,
        source: lead.source,
        assigned_to_id: lead.assigned_to?.id?.toString() ?? "",
      });
    } else {
      setForm({
        web_id: "", name: "", email: "", mobile: "", whatsapp: "", company: "",
        notes: "", priority: "warm", source: "manual", assigned_to_id: "",
      });
    }
    setErrors({});
  }, [lead, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.mobile.trim() && !form.email.trim()) e.mobile = "Mobile or email is required";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        web_id: form.web_id.trim() || null,
        name: form.name.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        company: form.company.trim() || null,
        notes: form.notes.trim() || null,
        priority: form.priority,
        source: form.source,
      };
      if (isAdmin && form.assigned_to_id) {
        payload.assigned_to_id = parseInt(form.assigned_to_id);
      }
      let saved: Lead;
      if (lead) {
        saved = await leadsApi.update(lead.id, payload);
      } else {
        saved = await leadsApi.create(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrors({ _: msg ?? "Failed to save lead" });
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string, val: string) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <Modal open={open} onClose={onClose} title={lead ? "Edit Lead" : "Add New Lead"} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Full Name" value={form.name} onChange={(e) => f("name", e.target.value)} required error={errors.name} />
          <Input label="Web ID" value={form.web_id} onChange={(e) => f("web_id", e.target.value)} placeholder="e.g. WEB-1042" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Mobile" value={form.mobile} onChange={(e) => f("mobile", e.target.value)} placeholder="+91..." error={errors.mobile} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => f("whatsapp", e.target.value)} placeholder="+91..." />
        </div>

        <Input label="Email" type="email" value={form.email} onChange={(e) => f("email", e.target.value)} />
        <Input label="Company" value={form.company} onChange={(e) => f("company", e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={form.priority} onChange={(e) => f("priority", e.target.value)} options={PRIORITY_OPTIONS} />
          <Select label="Source" value={form.source} onChange={(e) => f("source", e.target.value)} options={SOURCE_OPTIONS} />
        </div>

        {isAdmin && users.length > 0 && (
          <Select
            label="Assign To"
            value={form.assigned_to_id}
            onChange={(e) => f("assigned_to_id", e.target.value)}
            options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id.toString(), label: u.name }))]}
          />
        )}

        <Textarea label="Notes" value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Any additional notes..." />

        {errors._ && <p className="text-sm text-destructive">{errors._}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{lead ? "Save Changes" : "Add Lead"}</Button>
        </div>
      </form>
    </Modal>
  );
}
