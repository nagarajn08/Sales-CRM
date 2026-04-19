import { useState } from "react";
import { Modal } from "../ui/modal";
import { Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi } from "../../api";
import type { Lead } from "../../types";
import { cn } from "../../lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onLogged: () => void;
}

const OUTCOMES = [
  { value: "answered", label: "Answered" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "voicemail", label: "Voicemail" },
  { value: "callback_requested", label: "Callback" },
];

const DURATIONS = [
  { value: "1", label: "< 1 min" },
  { value: "2", label: "2 min" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hr" },
];

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  cols = 4,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
  cols?: number;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <div className={cn("grid gap-1.5", cols === 2 ? "grid-cols-2" : "grid-cols-4")}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? "" as T : opt.value)}
            className={cn(
              "text-xs py-2 px-1 rounded-lg border font-medium transition-all text-center",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CallLogModal({ open, onClose, lead, onLogged }: Props) {
  const [callType, setCallType] = useState<"outbound" | "inbound">("outbound");
  const [outcome, setOutcome] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCallType("outbound"); setOutcome(""); setDuration(""); setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await leadsApi.logCall(lead.id, {
        call_type: callType,
        outcome: outcome || undefined,
        duration_minutes: duration ? parseInt(duration) : undefined,
        notes: notes.trim() || undefined,
      });
      onLogged();
      onClose();
      reset();
    } catch {
      setError("Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Log Call — ${lead.name}`} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">

        {/* Lead info */}
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl text-sm">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M3 2h3l1.5 3.5-1.75 1.1a7.5 7.5 0 003.65 3.65L10.5 8.5 14 10v3a1 1 0 01-1 1A12 12 0 012 3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-foreground capitalize">{lead.name}</p>
            <p className="text-muted-foreground text-xs">{lead.mobile || lead.whatsapp || "No phone"}</p>
          </div>
        </div>

        {/* Call type toggle */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Call Type</p>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(["outbound", "inbound"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setCallType(t)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-all",
                  callType === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {t === "outbound" ? "I called" : "They called"}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome pills */}
        <PillGroup
          label="Outcome"
          options={OUTCOMES}
          value={outcome}
          onChange={setOutcome}
          cols={4}
        />

        {/* Duration pills */}
        <PillGroup
          label="Duration"
          options={DURATIONS}
          value={duration}
          onChange={setDuration}
          cols={4}
        />

        {/* Notes */}
        <Textarea
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What was discussed? Next steps?"
          rows={2}
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
