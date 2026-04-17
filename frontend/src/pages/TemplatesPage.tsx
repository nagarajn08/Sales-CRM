import { useEffect, useState } from "react";
import { templatesApi } from "../api";
import type { EmailTemplate } from "../types";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/modal";
import { Input, Textarea } from "../components/ui/input";
import { useAuth } from "../auth/AuthContext";
import { cn } from "../lib/utils";

interface TemplateForm {
  name: string;
  subject: string;
  body: string;
  is_global: boolean;
}

const emptyForm = (): TemplateForm => ({ name: "", subject: "", body: "", is_global: false });

// ── Section heading ───────────────────────────────────────────────────────────

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="h-3.5 w-0.5 rounded-full bg-primary" />
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{children}</p>
      {count !== undefined && (
        <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template, onEdit, onDelete,
}: {
  template: EmailTemplate;
  onEdit?: (t: EmailTemplate) => void;
  onDelete?: (t: EmailTemplate) => void;
}) {
  const badgeStyle = template.is_predefined
    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
    : template.is_global
    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";

  const badgeLabel = template.is_predefined ? "Built-in" : template.is_global ? "Global" : "Personal";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* card header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-secondary/20 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-primary">
              <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-xs leading-tight truncate">{template.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{template.subject}</p>
          </div>
        </div>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5", badgeStyle)}>
          {badgeLabel}
        </span>
      </div>

      {/* preview body */}
      <div className="px-4 py-3 flex-1">
        <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {template.body}
        </p>
      </div>

      {/* actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 px-4 pb-4 pt-1">
          {onEdit && (
            <button
              onClick={() => onEdit(template)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(template)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
                <path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await templatesApi.create(payload);
        setTemplates(prev => [...prev, created]);
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
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const predefinedTemplates = templates.filter(t => t.is_predefined);
  const globalTemplates     = templates.filter(t => t.is_global && !t.is_predefined);
  const myTemplates         = templates.filter(t => !t.is_global && !t.is_predefined);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Email Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{templates.length} template{templates.length !== 1 ? "s" : ""} available</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 mr-1.5">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          New Template
        </Button>
      </div>

      {/* ── Placeholder hint ── */}
      <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
        <div className="h-6 w-6 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5 text-indigo-500">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="text-xs text-indigo-700 dark:text-indigo-300">
          <p className="font-semibold mb-1">Available placeholders</p>
          <div className="flex flex-wrap gap-2">
            {[["{{name}}", "Lead's full name"], ["{{company}}", "Lead's company"]].map(([code, desc]) => (
              <span key={code} className="flex items-center gap-1">
                <code className="bg-white dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold">{code}</code>
                <span className="text-indigo-500 dark:text-indigo-400 text-[11px]">{desc}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Templates ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading templates…</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-xl text-muted-foreground">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-muted-foreground/40">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-semibold text-foreground text-sm">No templates yet</p>
          <p className="text-xs mt-1">Create your first reusable email template</p>
          <button onClick={openAdd} className="mt-3 text-xs text-primary hover:underline font-medium">
            + Create template
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {predefinedTemplates.length > 0 && (
            <section>
              <SectionTitle count={predefinedTemplates.length}>Predefined Templates</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {predefinedTemplates.map(t => <TemplateCard key={t.id} template={t} onEdit={openEdit} />)}
              </div>
            </section>
          )}

          {myTemplates.length > 0 && (
            <section>
              <SectionTitle count={myTemplates.length}>My Templates</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myTemplates.map(t => <TemplateCard key={t.id} template={t} onEdit={openEdit} onDelete={setDeleteTarget} />)}
              </div>
            </section>
          )}

          {globalTemplates.length > 0 && (
            <section>
              <SectionTitle count={globalTemplates.length}>Global Templates</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {globalTemplates.map(t => (
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

      {/* ── Form Modal ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTemplate ? "Edit Template" : "New Template"} maxWidth="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <Input label="Template Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required error={errors.name} placeholder="e.g. Introduction Email" />
          <Input label="Subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            required error={errors.subject} placeholder="Hi {{name}}, ..." />
          <Textarea label="Body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            required error={errors.body} className="min-h-[180px]" placeholder="Dear {{name}}, ..." />
          {isAdmin && (
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
              <input type="checkbox" checked={form.is_global} onChange={e => setForm(p => ({ ...p, is_global: e.target.checked }))} className="rounded" />
              <span>Make global <span className="text-xs text-muted-foreground">(visible to all users)</span></span>
            </label>
          )}
          {errors._ && <p className="text-xs text-destructive">{errors._}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>{editTemplate ? "Save Changes" : "Create Template"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-destructive">
                <path d="M4 5h12M7 5V3.5h6V5M8 9v5M12 9v5M5 5l.7 11h8.6L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">Delete template?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              <strong className="text-foreground">{deleteTarget.name}</strong> will be permanently deleted and cannot be recovered.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" loading={deleting} onClick={doDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
