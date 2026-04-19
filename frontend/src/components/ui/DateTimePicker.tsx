import { useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalStr(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  minDate?: Date;
}

export function DateTimePicker({ value, onChange, label, required, minDate }: Props) {
  const selected = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const cur = selected || new Date();
    const next = new Date(year, month, day, cur.getHours(), cur.getMinutes(), 0, 0);
    onChange(toLocalStr(next));
  };

  const setHour = (h: number) => {
    const cur = selected || new Date();
    onChange(toLocalStr(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), h, cur.getMinutes())));
  };

  const setMinute = (m: number) => {
    const cur = selected || new Date();
    onChange(toLocalStr(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), cur.getHours(), m)));
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const d = new Date(year, month, day);
    return d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  const isSelectedDay = (day: number) =>
    !!selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const displayLabel = selected
    ? `${selected.getDate().toString().padStart(2, "0")} ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()}  ${selected.getHours().toString().padStart(2, "0")}:${selected.getMinutes().toString().padStart(2, "0")}`
    : "";

  const hourVal = selected ? selected.getHours() : 10;
  const minVal = selected ? Math.floor(selected.getMinutes() / 5) * 5 : 0;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer text-left transition-colors hover:border-primary/50"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-muted-foreground shrink-0">
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className={displayLabel ? "text-foreground font-medium" : "text-muted-foreground"}>
          {displayLabel || "Select date & time"}
        </span>
        <span className="ml-auto text-muted-foreground">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
            {open
              ? <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </span>
      </button>

      {/* Inline calendar */}
      {open && (
        <div className="mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">

          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/40">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[month].slice(0, 3)} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="px-2 pt-2 pb-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-0.5 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const disabled = isDisabled(day);
                const sel = isSelectedDay(day);
                const today = isToday(day);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDay(day)}
                    className={[
                      "text-xs rounded-lg py-1.5 mx-0.5 my-0.5 text-center font-medium transition-all",
                      sel
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : today
                        ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                        : "hover:bg-secondary text-foreground",
                      disabled ? "opacity-25 cursor-not-allowed pointer-events-none" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time row */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-secondary/30">
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-muted-foreground shrink-0">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <select
              value={hourVal}
              onChange={(e) => setHour(parseInt(e.target.value))}
              className="flex-1 min-w-0 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground font-bold text-sm shrink-0">:</span>
            <select
              value={minVal}
              onChange={(e) => setMinute(parseInt(e.target.value))}
              className="flex-1 min-w-0 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
