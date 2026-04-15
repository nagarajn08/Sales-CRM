import { useState } from "react";
import { Modal } from "../ui/modal";
import { Select, Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi } from "../../api";
import type { Lead } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onLogged: () => void;
}

const CALL_TYPE_OPTIONS = [
  { value: "outbound", label: "Outbound (I called)" },
  { value: "inbound", label: "Inbound (They called)" },
];

const OUTCOME_OPTIONS = [
  { value: "", label: "Select outcome..." },
  { value: "answered", label: "Answered" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "voicemail", label: "Voicemail" },
  { value: "callback_requested", label: "Callback Requested" },
];

const DURATION_OPTIONS = [
  { value: "", label: "Select duration..." },
  { value: "1", label: "< 1 min" },
  { value: "2", label: "2 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
];

export function CallLogModal({ open, onClose, lead, onLogged }: Props) {
  const [form, setForm] = useState({
    call_type: "outbound",
    outcome: "",
    duration_minutes: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await leadsApi.logCall(lead.id, {
        call_type: form.call_type,
        outcome: form.outcome || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        notes: form.notes.trim() || undefined,
      });
      onLogged();
      onClose();
      setForm({ call_type: "outbound", outcome: "", duration_minutes: "", notes: "" });
    } catch {
      setError("Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Log Call — ${lead.name}`} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg text-sm">
          <span className="text-2xl">📞</span>
          <div>
            <p className="font-medium text-foreground">{lead.name}</p>
            <p className="text-muted-foreground text-xs">{lead.mobile || lead.whatsapp || "No phone"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select label="Call Type" value={form.call_type} onChange={e => f("call_type", e.target.value)} options={CALL_TYPE_OPTIONS} />
          <Select label="Outcome" value={form.outcome} onChange={e => f("outcome", e.target.value)} options={OUTCOME_OPTIONS} />
        </div>

        <Select label="Duration" value={form.duration_minutes} onChange={e => f("duration_minutes", e.target.value)} options={DURATION_OPTIONS} />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={e => f("notes", e.target.value)}
          placeholder="What was discussed? Next steps?"
          rows={3}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" className="flex-1" loading={saving}>Log Call</Button>
        </div>
      </form>
    </Modal>
  );
}
