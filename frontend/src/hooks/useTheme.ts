import { useEffect, useState } from "react";

export type ThemeColor = "blue" | "green" | "purple" | "orange" | "red" | "pink" | "teal" | "indigo" | "yellow" | "cyan" | "sky" | "grey";

interface ThemeState {
  color: ThemeColor;
  dark: boolean;
}

const DEFAULT_THEME: ThemeState = { color: "blue", dark: false };

function storageKey(userId?: number | null): string {
  return userId ? `crm_theme_${userId}` : "crm_theme";
}

function applyTheme({ color, dark }: ThemeState) {
  const root = document.documentElement;
  root.setAttribute("data-theme", color);
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
}

function loadTheme(userId?: number | null): ThemeState {
  try {
    if (userId) {
      // User is known — only read their own key, never bleed from other users
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) return JSON.parse(saved);
      return DEFAULT_THEME;
    }
    // Boot phase (no user yet) — use generic key to avoid flash
    const generic = localStorage.getItem("crm_theme");
    if (generic) return JSON.parse(generic);
  } catch {}
  return DEFAULT_THEME;
}

function saveTheme(state: ThemeState, userId?: number | null) {
  const key = storageKey(userId);
  localStorage.setItem(key, JSON.stringify(state));
  // Also keep generic key in sync so initTheme() at boot shows a sane default
  localStorage.setItem("crm_theme", JSON.stringify(state));
}

export function useTheme(userId?: number | null) {
  const [theme, setThemeState] = useState<ThemeState>(() => loadTheme(userId));

  // Re-apply whenever the user changes (login / user switch)
  useEffect(() => {
    const loaded = loadTheme(userId);
    setThemeState(loaded);
    applyTheme(loaded);
  }, [userId]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: Partial<ThemeState>) => {
    setThemeState((prev) => {
      const updated = { ...prev, ...next };
      saveTheme(updated, userId);
      return updated;
    });
  };

  return { theme, setTheme };
}

// standalone initializer — call once at app boot before React renders
// uses generic key only (user not known yet); correct theme is applied after auth
export function initTheme() {
  applyTheme(loadTheme());
}
