import { useEffect, useRef, useState } from "react";

export type ThemeColor = "blue" | "green" | "purple" | "orange" | "red" | "pink" | "teal" | "indigo" | "yellow" | "cyan" | "sky" | "grey" | "custom";
export type ThemeMode  = "light" | "dark" | "system";
export type ThemeFont  = "dm-sans" | "inter" | "poppins" | "nunito" | "geist";

export const FONT_OPTIONS: { value: ThemeFont; label: string; family: string }[] = [
  { value: "dm-sans",  label: "DM Sans",  family: "'DM Sans', system-ui, sans-serif" },
  { value: "inter",    label: "Inter",    family: "'Inter', system-ui, sans-serif" },
  { value: "poppins",  label: "Poppins",  family: "'Poppins', system-ui, sans-serif" },
  { value: "nunito",   label: "Nunito",   family: "'Nunito', system-ui, sans-serif" },
  { value: "geist",    label: "Geist",    family: "'Geist', system-ui, sans-serif" },
];

export interface ThemeState {
  color:     ThemeColor;
  customHex: string;
  mode:      ThemeMode;
  font:      ThemeFont;
}

const DEFAULT_THEME: ThemeState = { color: "indigo", customHex: "#6366f1", mode: "light", font: "dm-sans" };

// Map predefined colors to a representative hex (used as display value)
export const PREDEFINED_HEX: Record<string, string> = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  purple: "#a855f7",
  orange: "#f97316",
  red:    "#ef4444",
  pink:   "#ec4899",
  teal:   "#14b8a6",
  indigo: "#6366f1",
  yellow: "#eab308",
  cyan:   "#06b6d4",
  sky:    "#0ea5e9",
  grey:   "#64748b",
};

export function themeHex(state: ThemeState): string {
  return state.color === "custom"
    ? state.customHex || "#6366f1"
    : PREDEFINED_HEX[state.color] || "#6366f1";
}

function hexToHsl(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches;
  return mode === "dark";
}

function applyTheme(state: ThemeState, isDark: boolean) {
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else        root.classList.remove("dark");

  if (state.color === "custom" && state.customHex) {
    root.removeAttribute("data-theme");
    const hsl = hexToHsl(state.customHex);
    if (hsl) {
      const [h, s, l] = hsl;
      root.style.setProperty("--primary",       `${h} ${s}% ${l}%`);
      root.style.setProperty("--ring",           `${h} ${s}% ${l}%`);
      root.style.setProperty("--sidebar-accent", `${h} ${s}% ${isDark ? Math.min(l + 14, 88) : l}%`);
      // Auto-contrast: light primary → dark text, dark primary → white text
      const fg = l > 58 ? "240 14% 10%" : "0 0% 100%";
      root.style.setProperty("--primary-foreground", fg);
    }
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-accent");
    root.style.removeProperty("--primary-foreground");
    root.setAttribute("data-theme", state.color === "custom" ? "indigo" : state.color);
  }

  // Apply font
  const font = FONT_OPTIONS.find(f => f.value === (state.font ?? "dm-sans"));
  if (font) document.body.style.fontFamily = font.family;
}

function storageKey(userId?: number | null) {
  return userId ? `crm_theme_${userId}` : "crm_theme";
}

function loadTheme(userId?: number | null): ThemeState {
  try {
    const raw = userId
      ? (localStorage.getItem(storageKey(userId)) ?? localStorage.getItem("crm_theme"))
      : localStorage.getItem("crm_theme");
    if (raw) {
      const p = JSON.parse(raw) as Partial<ThemeState> & { dark?: boolean };
      // Migrate legacy dark: boolean → mode
      if (p.mode == null) p.mode = p.dark ? "dark" : "light";
      return { ...DEFAULT_THEME, ...p };
    }
  } catch {}
  return DEFAULT_THEME;
}

function saveTheme(state: ThemeState, userId?: number | null) {
  const data = JSON.stringify(state);
  localStorage.setItem(storageKey(userId), data);
  localStorage.setItem("crm_theme", data);
}

export function useTheme(userId?: number | null) {
  const [theme, setThemeState] = useState<ThemeState>(() => loadTheme(userId));
  const mqRef = useRef<MediaQueryList | null>(null);

  // System preference listener
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mqRef.current = mq;
    const handler = () => {
      setThemeState(prev => {
        if (prev.mode === "system") applyTheme(prev, mq.matches);
        return prev;
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Re-apply on user change (login / switch)
  useEffect(() => {
    const loaded = loadTheme(userId);
    setThemeState(loaded);
    applyTheme(loaded, resolveDark(loaded.mode));
  }, [userId]);

  useEffect(() => {
    applyTheme(theme, resolveDark(theme.mode));
  }, [theme]);

  const setTheme = (next: Partial<ThemeState>) => {
    setThemeState(prev => {
      const updated = { ...prev, ...next };
      saveTheme(updated, userId);
      return updated;
    });
  };

  return { theme, setTheme };
}

// Called once at app boot before React renders (no user known yet)
export function initTheme() {
  const state = loadTheme();
  applyTheme(state, resolveDark(state.mode));
}
