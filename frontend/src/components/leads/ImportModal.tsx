import { useEffect, useRef, useState } from "react";
import { Modal } from "../ui/modal";
import { Select } from "../ui/input";
import { Button } from "../ui/button";
import { leadsApi, usersApi } from "../../api";
import type { User } from "../../types";
import { useAuth } from "../../auth/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ open, onClose, onImported }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [users, setUsers] = useState<User[]>([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && isAdmin) {
      usersApi.list().then(setUsers).catch(() => {});
    }
    if (!open) {
      setFile(null);
      setResult(null);
      setError("");
    }
  }, [open, isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a file"); return; }
    setImporting(true);
    setError("");
    try {
      const res = await leadsApi.import(file, assignedToId ? parseInt(assignedToId) : undefined);
      setResult(res);
      onImported();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Leads from CSV / Excel">
      <div className="space-y-4">
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="font-semibold text-green-700 dark:text-green-400">Import complete!</p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                {result.imported} leads imported, {result.skipped} skipped (duplicates).
              </p>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <p className="text-2xl mb-2">📎</p>
              <p className="text-sm font-medium text-foreground mb-1">
                {file ? file.name : "Select a CSV or Excel file"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Supported: .csv, .xlsx, .xls
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Browse File
              </Button>
            </div>

            <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected columns:</p>
              <p>name, mobile, email, whatsapp, company, notes, priority (hot/warm/cold), source</p>
            </div>

            {isAdmin && users.length > 0 && (
              <Select
                label="Assign all imported leads to"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                options={[{ value: "", label: "Self (you)" }, ...users.map((u) => ({ value: u.id.toString(), label: u.name }))]}
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={importing} disabled={!file}>Import Leads</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
