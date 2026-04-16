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

const FIELDS = [
  { label: "Name",     note: "Required",  aliases: "Name, Full Name, Contact Name" },
  { label: "Mobile",   note: "Optional",  aliases: "Mobile, Phone, Phone Number, Cell" },
  { label: "Email",    note: "Optional",  aliases: "Email, Email Address" },
  { label: "WhatsApp", note: "Optional",  aliases: "WhatsApp, WA Number" },
  { label: "Company",  note: "Optional",  aliases: "Company, Company Name, Organisation" },
  { label: "Notes",    note: "Optional",  aliases: "Notes, Remarks, Comments" },
  { label: "Priority", note: "Optional",  aliases: "Priority → hot / warm / cold (defaults to warm)" },
];

function downloadTemplate() {
  const header = "Name,Mobile,Email,Company,Notes,Priority";
  const sample = "Rahul Sharma,9876543210,rahul@example.com,ABC Corp,Met at expo,warm";
  const blob = new Blob([header + "\n" + sample], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "leads_template.csv";
  a.click();
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
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && isAdmin) usersApi.list().then(setUsers).catch(() => {});
    if (!open) { setFile(null); setResult(null); setError(""); setAssignedToId(""); }
  }, [open, isAdmin]);

  const pickFile = (f: File) => {
    const ok = f.name.match(/\.(csv|xlsx|xls)$/i);
    if (!ok) { setError("Only .csv, .xlsx, or .xls files are supported."); return; }
    setError("");
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a file first."); return; }
    setImporting(true);
    setError("");
    try {
      const res = await leadsApi.import(file, assignedToId ? parseInt(assignedToId) : undefined);
      setResult(res);
      onImported();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Import failed. Please check your file and try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Leads" maxWidth="max-w-lg">
      <div className="space-y-4">

        {result ? (
          /* ── Success state ── */
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-green-600 dark:text-green-400">
                  <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-semibold text-foreground">Import complete</p>
              <div className="flex gap-4 text-sm mt-1">
                <span className="text-green-600 dark:text-green-400 font-medium">{result.imported} leads added</span>
                {result.skipped > 0 && <span className="text-muted-foreground">{result.skipped} rows skipped (empty name)</span>}
              </div>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">

            {/* Download template */}
            <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Not sure about the format?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Download our ready-to-fill template</p>
              </div>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download Template
              </button>
            </div>

            {/* Column guide */}
            <div className="rounded-lg border border-border divide-y divide-border text-xs overflow-hidden">
              <div className="flex items-center px-3 py-2 bg-secondary">
                <span className="flex-1 font-semibold text-muted-foreground uppercase tracking-wide">Column name in your file</span>
                <span className="w-16 text-right font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
              </div>
              {FIELDS.map(f => (
                <div key={f.label} className="flex items-start px-3 py-2 gap-2">
                  <div className="flex-1">
                    <span className="font-medium text-foreground">{f.label}</span>
                    <span className="text-muted-foreground ml-1.5">{f.aliases}</span>
                  </div>
                  <span className={`w-16 text-right font-semibold shrink-0 ${f.note === "Required" ? "text-amber-600" : "text-muted-foreground"}`}>
                    {f.note}
                  </span>
                </div>
              ))}
            </div>

            {/* Drop zone */}
            <div
              className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer
                ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                ${file ? "bg-secondary" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
            >
              <div className="flex flex-col items-center gap-2 py-6 px-4 text-center pointer-events-none">
                {file ? (
                  <>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                        <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M12 4v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                        <path d="M10 13V4M7 7l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
              />
            </div>

            {/* Assign to */}
            {isAdmin && users.length > 0 && (
              <Select
                label="Assign all imported leads to"
                value={assignedToId}
                onChange={e => setAssignedToId(e.target.value)}
                options={[
                  { value: "", label: "Me (unassigned to team)" },
                  ...users.map(u => ({ value: u.id.toString(), label: u.name })),
                ]}
              />
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={importing} disabled={!file}>
                Import Leads
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
