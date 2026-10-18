import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";
const KEY = "cv-theme"; // the only localStorage key the site uses
const THEME_COLOR: Record<Theme, string> = { light: "#e3ecf0", dark: "#0a1318" };

// public/theme-init.js already set data-theme before first paint; read it back.
const readCurrent = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function apply(theme: Theme) {
  const root = document.documentElement;
  // Pause every transition for one frame so colours swap instantly instead of animating.
  root.setAttribute("data-theme-switching", "");
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  try { localStorage.setItem(KEY, theme); } catch { /* storage blocked: the choice just won't persist */ }
  // Force the style recalculation while transitions are off, then re-enable them. No frame needed.
  void getComputedStyle(root).backgroundColor;
  void root.offsetHeight;
  root.removeAttribute("data-theme-switching");
}

interface ThemeState { theme: Theme; toggle: () => void }
const Ctx = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readCurrent);
  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
  }, [theme]);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme outside ThemeProvider");
  return v;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="btn icon-btn" aria-label="Dark theme" aria-pressed={theme === "dark"} title="Dark theme" onClick={toggle}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
