import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Input, Select, Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi, usersApi, customFieldsApi, type CustomFieldDef } from "../../api";
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
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    whatsapp: "",
    company: "",
    notes: "",
    priority: "warm",
    source: "manual",
    assigned_to_id: "",
    tags: "",
    deal_value: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) usersApi.list().then(setUsers).catch(() => {});
    customFieldsApi.list().then(setCustomFieldDefs).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        email: lead.email ?? "",
        mobile: lead.mobile ?? "",
        whatsapp: lead.whatsapp ?? "",
        company: lead.company ?? "",
        notes: lead.notes ?? "",
        priority: lead.priority,
        source: lead.source,
        assigned_to_id: lead.assigned_to?.id?.toString() ?? "",
        tags: lead.tags ?? "",
        deal_value: lead.deal_value?.toString() ?? "",
      });
      // Load existing custom field values
      const existing = (lead.custom_fields ?? {}) as Record<string, unknown>;
      const vals: Record<string, string> = {};
      for (const [k, v] of Object.entries(existing)) vals[k] = String(v ?? "");
      setCustomValues(vals);
    } else {
      setForm({
        name: "", email: "", mobile: "", whatsapp: "", company: "",
        notes: "", priority: "warm", source: "manual", assigned_to_id: "", tags: "", deal_value: "",
      });
      setCustomValues({});
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
        name: form.name.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        company: form.company.trim() || null,
        notes: form.notes.trim() || null,
        priority: form.priority,
        source: form.source,
        tags: form.tags.trim() || null,
        deal_value: form.deal_value.trim() ? parseFloat(form.deal_value) : null,
        custom_fields: Object.keys(customValues).length > 0 ? customValues : null,
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
    <Modal open={open} onClose={onClose} title={lead ? "Edit Lead" : "Add New Lead"} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Full Name" value={form.name} onChange={(e) => f("name", e.target.value)} required error={errors.name} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input label="Mobile" value={form.mobile} onChange={(e) => f("mobile", e.target.value)} placeholder="+91..." error={errors.mobile} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => f("whatsapp", e.target.value)} placeholder="+91..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input label="Email" type="email" value={form.email} onChange={(e) => f("email", e.target.value)} />
          <Input label="Company" value={form.company} onChange={(e) => f("company", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select label="Priority" value={form.priority} onChange={(e) => f("priority", e.target.value)} options={PRIORITY_OPTIONS} />
          <Select label="Source" value={form.source} onChange={(e) => f("source", e.target.value)} options={SOURCE_OPTIONS} />
        </div>

        <Input
          label="Deal Value (₹)"
          type="number"
          min="0"
          step="0.01"
          value={form.deal_value}
          onChange={(e) => f("deal_value", e.target.value)}
          placeholder="e.g. 50000"
        />

        {isAdmin && users.length > 0 && (
          <Select
            label="Assign To"
            value={form.assigned_to_id}
            onChange={(e) => f("assigned_to_id", e.target.value)}
            options={[{ value: "", label: "Unassigned" }, ...users.map((u) => ({ value: u.id.toString(), label: u.name }))]}
          />
        )}

        <Input
          label="Tags"
          value={form.tags}
          onChange={(e) => f("tags", e.target.value)}
          placeholder="hot, referral, enterprise (comma separated)"
        />

        <Textarea label="Notes" value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Any additional notes..." rows={2} />

        {/* Custom Fields */}
        {customFieldDefs.length > 0 && (
          <div className="pt-1 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Fields</p>
            {customFieldDefs.map(def => (
              <div key={def.id}>
                {def.field_type === "text" && (
                  <Input
                    label={def.label + (def.required ? " *" : "")}
                    value={customValues[def.name] ?? ""}
                    onChange={e => setCustomValues(v => ({ ...v, [def.name]: e.target.value }))}
                  />
                )}
                {def.field_type === "number" && (
                  <Input
                    label={def.label + (def.required ? " *" : "")}
                    type="number"
                    value={customValues[def.name] ?? ""}
                    onChange={e => setCustomValues(v => ({ ...v, [def.name]: e.target.value }))}
                  />
                )}
                {def.field_type === "date" && (
                  <Input
                    label={def.label + (def.required ? " *" : "")}
                    type="date"
                    value={customValues[def.name] ?? ""}
                    onChange={e => setCustomValues(v => ({ ...v, [def.name]: e.target.value }))}
                  />
                )}
                {def.field_type === "dropdown" && def.options && (
                  <Select
                    label={def.label + (def.required ? " *" : "")}
                    value={customValues[def.name] ?? ""}
                    onChange={e => setCustomValues(v => ({ ...v, [def.name]: e.target.value }))}
                    options={[{ value: "", label: "Select..." }, ...def.options.map(o => ({ value: o, label: o }))]}
                  />
                )}
                {def.field_type === "checkbox" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customValues[def.name] === "true"}
                      onChange={e => setCustomValues(v => ({ ...v, [def.name]: e.target.checked ? "true" : "false" }))}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">{def.label}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {errors._ && <p className="text-xs text-destructive">{errors._}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" className="flex-1" loading={saving}>{lead ? "Save Changes" : "Add Lead"}</Button>
        </div>
      </form>
    </Modal>
  );
}
