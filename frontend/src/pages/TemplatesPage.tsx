import { useEffect, useState } from "react";
import { templatesApi } from "../api";
import type { EmailTemplate } from "../types";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { Input, Textarea } from "../components/ui/input";
import { useAuth } from "../auth/AuthContext";

interface TemplateForm {
  name: string;
  subject: string;
  body: string;
  is_global: boolean;
}

const emptyForm = (): TemplateForm => ({ name: "", subject: "", body: "", is_global: false });

export default function TemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    templatesApi.list().then(setTemplates).finally(() => setLoading(false));
  };

  useEffect(fetchTemplates, []);

  const openAdd = () => { setEditTemplate(null); setForm(emptyForm()); setErrors({}); setShowForm(true); };
  const openEdit = (t: EmailTemplate) => {
    setEditTemplate(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, is_global: t.is_global });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.body.trim()) e.body = "Body is required";
    return e;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), subject: form.subject.trim(), body: form.body.trim(), is_global: form.is_global };
      if (editTemplate) {
        const updated = await templatesApi.update(editTemplate.id, payload);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await templatesApi.create(payload);
        setTemplates((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrors({ _: msg ?? "Failed to save template" });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await templatesApi.delete(deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const myTemplates = templates.filter((t) => !t.is_global);
  const globalTemplates = templates.filter((t) => t.is_global);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Create reusable email templates for leads</p>
        </div>
        <Button onClick={openAdd}>+ New Template</Button>
      </div>

      <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
        Placeholders: <code className="bg-card px-1.5 py-0.5 rounded border border-border">{"{{name}}"}</code> — lead name,{" "}
        <code className="bg-card px-1.5 py-0.5 rounded border border-border">{"{{company}}"}</code> — lead company
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">✉️</p>
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create your first email template</p>
          <Button className="mt-4" onClick={openAdd}>Create Template</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {myTemplates.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Templates</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myTemplates.map((t) => <TemplateCard key={t.id} template={t} onEdit={openEdit} onDelete={setDeleteTarget} />)}
              </div>
            </section>
          )}
          {globalTemplates.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Global Templates</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {globalTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onEdit={isAdmin ? openEdit : undefined}
                    onDelete={isAdmin ? setDeleteTarget : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTemplate ? "Edit Template" : "New Template"} maxWidth="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required error={errors.name} placeholder="e.g. Introduction Email" />
          <Input label="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required error={errors.subject} placeholder="Hi {{name}}, ..." />
          <Textarea label="Body" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} required error={errors.body} className="min-h-[180px]" placeholder="Dear {{name}}, ..." />
          {isAdmin && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <input type="checkbox" checked={form.is_global} onChange={(e) => setForm((p) => ({ ...p, is_global: e.target.checked }))} className="rounded" />
              Make this a global template (visible to all users)
            </label>
          )}
          {errors._ && <p className="text-sm text-destructive">{errors._}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editTemplate ? "Save Changes" : "Create Template"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-foreground mb-2">Delete Template?</h3>
            <p className="text-sm text-muted-foreground mb-4">Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={doDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: EmailTemplate;
  onEdit?: (t: EmailTemplate) => void;
  onDelete?: (t: EmailTemplate) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
          {template.is_global && <Badge className="bg-purple-100 text-purple-700 shrink-0">Global</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{template.subject}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{template.body}</p>
        {(onEdit || onDelete) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            {onEdit && <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(template)}>Edit</Button>}
            {onDelete && <Button size="sm" variant="destructive" className="flex-1" onClick={() => onDelete(template)}>Delete</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
