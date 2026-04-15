import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── IST date helpers ───────────────────────────────────────────────────────
// Backend stores naive UTC datetimes; FastAPI serialises them WITHOUT a "Z",
// so `new Date("2024-01-01T10:00:00")` is treated as *local* by JS engines.
// We force UTC parsing by appending "Z" when the string has no offset.

function toUTC(raw: string): Date {
  const s = raw.trim();
  // Already has timezone offset or "Z" → parse as-is
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  // Naive datetime from backend — treat as UTC
  return new Date(s + "Z");
}

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

/** "14 Apr 2025" */
export function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  return toUTC(raw).toLocaleDateString("en-IN", { ...IST, day: "2-digit", month: "short", year: "numeric" });
}

/** "14 Apr 2025, 03:45 PM" */
export function fmtDateTime(raw: string | null | undefined): string {
  if (!raw) return "—";
  return toUTC(raw).toLocaleString("en-IN", {
    ...IST,
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** "03:45 PM" only */
export function fmtTime(raw: string | null | undefined): string {
  if (!raw) return "—";
  return toUTC(raw).toLocaleTimeString("en-IN", { ...IST, hour: "2-digit", minute: "2-digit", hour12: true });
}
