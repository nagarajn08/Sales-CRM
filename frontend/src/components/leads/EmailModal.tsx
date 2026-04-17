import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Select, Textarea, Input } from "../ui/input";
import { Button } from "../ui/button";
import { templatesApi } from "../../api";
import api from "../../api/axiosInstance";
import type { Lead, EmailTemplate } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}

export function EmailModal({ open, onClose, lead }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      templatesApi.list().then(setTemplates).catch(() => {});
      setSent(false);
      setError("");
    }
  }, [open]);

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    const t = templates.find((t) => t.id.toString() === id);
    if (t) {
      // Replace placeholders
      const name = lead.name;
      setSubject(t.subject.replace(/\{\{name\}\}/gi, name));
      setBody(t.body.replace(/\{\{name\}\}/gi, name).replace(/\{\{company\}\}/gi, lead.company ?? ""));
    } else {
      setSubject("");
      setBody("");
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.email) { setError("This lead has no email address"); return; }
    if (!subject.trim() || !body.trim()) { setError("Subject and body are required"); return; }
    setSending(true);
    setError("");
    try {
      await api.post(`/api/leads/${lead.id}/email`, {
        subject: subject.trim(),
        body: body.trim(),
        template_id: selectedId ? parseInt(selectedId) : null,
      });
      setSent(true);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Send Email" maxWidth="max-w-2xl">
      {sent ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-foreground">Email sent successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">Sent to {lead.email}</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary text-sm">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium text-foreground capitalize">{lead.name}</span>
            <span className="text-muted-foreground">({lead.email ?? "No email address"})</span>
          </div>

          {templates.length > 0 && (
            <Select
              label="Use Template"
              value={selectedId}
              onChange={(e) => selectTemplate(e.target.value)}
              options={[{ value: "", label: "— Blank / Custom —" }, ...templates.map((t) => ({ value: t.id.toString(), label: `${t.name}${t.is_global ? " (Global)" : ""}` }))]}
            />
          )}

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <Textarea
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            className="min-h-[160px]"
          />

          <p className="text-xs text-muted-foreground">
            Tip: Use <code className="bg-secondary px-1 rounded">{"{{name}}"}</code> and <code className="bg-secondary px-1 rounded">{"{{company}}"}</code> as placeholders.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={sending} disabled={!lead.email}>Send Email</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
