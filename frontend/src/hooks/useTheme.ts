import { useEffect, useState } from "react";

export type ThemeColor = "blue" | "green" | "purple" | "orange";

interface ThemeState {
  color: ThemeColor;
  dark: boolean;
}

function applyTheme({ color, dark }: ThemeState) {
  const root = document.documentElement;
  root.setAttribute("data-theme", color);
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
}

function load(): ThemeState {
  try {
    const saved = localStorage.getItem("crm_theme");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { color: "blue", dark: false };
}

function save(state: ThemeState) {
  localStorage.setItem("crm_theme", JSON.stringify(state));
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeState>(load);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: Partial<ThemeState>) => {
    setThemeState((prev) => {
      const updated = { ...prev, ...next };
      save(updated);
      return updated;
    });
  };

  return { theme, setTheme };
}

// standalone initializer — call once at app boot before React renders
export function initTheme() {
  applyTheme(load());
}
