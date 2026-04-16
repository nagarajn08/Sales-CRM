import { useEffect, useState } from "react";
import { customFieldsApi, type CustomFieldDef, type FieldType } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { cn } from "../lib/utils";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Yes / No",
};

const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "T",
  number: "#",
  date: "📅",
  dropdown: "▾",
  checkbox: "☑",
};

function FieldTypeChip({ type }: { type: FieldType }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
      <span>{FIELD_TYPE_ICONS[type]}</span>
      {FIELD_TYPE_LABELS[type]}
    </span>
  );
}

interface CreateFormState {
  name: string;
  label: string;
  field_type: FieldType;
  options: string;
  required: boolean;
}

const EMPTY_FORM: CreateFormState = {
  name: "", label: "", field_type: "text", options: "", required: false,
};

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    customFieldsApi.list().then(setFields).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.label.trim()) {
      setError("Name and label are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const opts = form.field_type === "dropdown"
        ? form.options.split(",").map(o => o.trim()).filter(Boolean)
        : undefined;
      await customFieldsApi.create({
        name: form.name.trim(),
        label: form.label.trim(),
        field_type: form.field_type,
        options: opts,
        required: form.required,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to create field.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (field: CustomFieldDef) => {
    await customFieldsApi.update(field.id, { is_active: !field.is_active });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this custom field? Existing lead data for this field will remain but no longer display.")) return;
    setDeletingId(id);
    try {
      await customFieldsApi.delete(id);
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Custom Fields</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add your own fields to every lead form</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => { setShowForm(true); setError(null); }}>
            + Add Field
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm">New Custom Field</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Field Name (internal key)"
                placeholder="e.g. budget_range"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }))}
                helpText="Lowercase, underscores only"
              />
              <Input
                label="Display Label"
                placeholder="e.g. Budget Range"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Field Type</p>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, field_type: t }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      form.field_type === t
                        ? "bg-primary/10 border-primary text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {FIELD_TYPE_ICONS[t]} {FIELD_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {form.field_type === "dropdown" && (
              <Input
                label="Options (comma separated)"
                placeholder="Option A, Option B, Option C"
                value={form.options}
                onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
              />
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.required}
                onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Required field</span>
            </label>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={handleCreate}>
                Create Field
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : fields.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No custom fields yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add fields to capture extra information on every lead.</p>
            {!showForm && (
              <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>+ Add your first field</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {fields.map(field => (
                <div key={field.id} className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition-colors",
                  !field.is_active && "opacity-50"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{field.label}</span>
                      <FieldTypeChip type={field.field_type} />
                      {field.required && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Required</span>
                      )}
                      {!field.is_active && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">Disabled</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Key: <code className="bg-secondary px-1 rounded">{field.name}</code>
                      {field.options && field.options.length > 0 && (
                        <span className="ml-2">Options: {field.options.join(", ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(field)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      {field.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(field.id)}
                      disabled={deletingId === field.id}
                      className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 pb-4 text-sm text-muted-foreground space-y-1.5">
          <p className="font-semibold text-foreground text-xs uppercase tracking-wide">How it works</p>
          <p>Custom fields appear in the lead create/edit form and on each lead's detail page.</p>
          <p>Disabling a field hides it from new forms but keeps existing data intact.</p>
          <p>Deleting a field is permanent — the definition is removed but values on leads remain in storage.</p>
        </CardContent>
      </Card>
    </div>
  );
}
