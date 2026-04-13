import { useState } from "react";
import { Modal } from "../ui/modal";
import { Textarea } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi } from "../../api";
import type { Lead } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onCommented: (lead: Lead) => void;
}

export function CommentModal({ open, onClose, lead, onCommented }: Props) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) { setError("Comment cannot be empty"); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await leadsApi.addComment(lead.id, comment.trim());
      onCommented(updated);
      setComment("");
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Comment">
      <form onSubmit={submit} className="space-y-4">
        <Textarea
          label="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your comment here..."
          required
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add Comment</Button>
        </div>
      </form>
    </Modal>
  );
}
