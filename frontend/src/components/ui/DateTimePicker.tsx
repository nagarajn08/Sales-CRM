import { useEffect, useRef, useState } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build days grid
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
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return d < min;
  };

  const isSelectedDay = (day: number) =>
    selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const displayLabel = selected
    ? `${selected.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  ${selected.getHours().toString().padStart(2, "0")}:${selected.getMinutes().toString().padStart(2, "0")}`
    : "";

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer text-left transition-colors hover:border-primary/50"
      >
        <span className="text-lg leading-none">📅</span>
        <span className={displayLabel ? "text-foreground font-medium" : "text-muted-foreground"}>
          {displayLabel || "Click to select date & time"}
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute z-[100] mt-2 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-lg leading-none"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-lg leading-none"
            >
              ›
            </button>
          </div>

          <div className="p-3">
            {/* Day name headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
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
                      "text-xs rounded-lg py-1.5 text-center font-medium transition-all",
                      sel
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : today
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "hover:bg-secondary text-foreground",
                      disabled ? "opacity-25 cursor-not-allowed pointer-events-none" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time picker */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Time
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Hour</label>
                  <select
                    value={selected ? selected.getHours() : 10}
                    onChange={(e) => setHour(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")} {i < 12 ? "AM" : "PM"}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-muted-foreground font-bold mt-4">:</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Minute</label>
                  <select
                    value={selected ? Math.floor(selected.getMinutes() / 5) * 5 : 0}
                    onChange={(e) => setMinute(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 hover:opacity-90 transition-opacity"
            >
              Done ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
