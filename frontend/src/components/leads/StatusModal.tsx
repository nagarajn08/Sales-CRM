import { useState } from "react";
import { Modal } from "../ui/modal";
import { Select, Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { DateTimePicker } from "../ui/DateTimePicker";
import { leadsApi } from "../../api";
import type { Lead, LeadStatus } from "../../types";
import { STATUS_LABELS, FOLLOWUP_REQUIRED_STATUSES, TERMINAL_STATUSES } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "call_back", label: "Call Back" },
  { value: "busy", label: "Busy" },
  { value: "not_reachable", label: "Not Reachable" },
  { value: "not_interested", label: "Not Interested" },
  { value: "converted", label: "Converted" },
];

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StatusModal({ open, onClose, lead, onUpdated }: Props) {
  const defaultFollowup = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return toLocalDatetimeValue(d);
  };

  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [followupAt, setFollowupAt] = useState(defaultFollowup());
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsFollowup = FOLLOWUP_REQUIRED_STATUSES.includes(status);
  const isTerminal = TERMINAL_STATUSES.includes(status);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsFollowup && !followupAt) {
      setError("Please select a follow-up date and time");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { status };
      if (needsFollowup && followupAt) {
        payload.next_followup_at = new Date(followupAt).toISOString();
      }
      if (comment.trim()) payload.comment = comment.trim();
      const updated = await leadsApi.updateStatus(lead.id, payload);
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Update Lead Status">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          options={STATUS_OPTIONS}
        />

        {isTerminal && status === "not_interested" && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Marking as <strong>Not Interested</strong> will end all follow-ups for this lead.
          </div>
        )}

        {status === "converted" && (
          <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
            Marking as <strong>Converted</strong> will complete the follow-up journey.
          </div>
        )}

        {needsFollowup && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Follow-up Date & Time <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">📅</span>
              <input
                type="datetime-local"
                value={followupAt}
                min={toLocalDatetimeValue(new Date())}
                onChange={(e) => setFollowupAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click the field to open the date &amp; time picker</p>
          </div>
        )}

        <Textarea
          label="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note about this status change..."
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Update Status</Button>
        </div>
      </form>
    </Modal>
  );
}
