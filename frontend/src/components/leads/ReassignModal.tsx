import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Select } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi, usersApi } from "../../api";
import type { Lead, User } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onReassigned: (lead: Lead) => void;
}

export function ReassignModal({ open, onClose, lead, onReassigned }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      usersApi.list().then(setUsers).catch(() => {});
      setSelectedId(lead.assigned_to?.id?.toString() ?? "");
    }
  }, [open, lead]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { setError("Please select a user"); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await leadsApi.reassign(lead.id, parseInt(selectedId));
      onReassigned(updated);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to reassign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reassign Lead">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Reassigning: <span className="font-medium text-foreground">{lead.name}</span>
        </p>
        <Select
          label="Assign To"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          options={[{ value: "", label: "— Select user —" }, ...users.map((u) => ({ value: u.id.toString(), label: `${u.name} (${u.role})` }))]}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Reassign</Button>
        </div>
      </form>
    </Modal>
  );
}
