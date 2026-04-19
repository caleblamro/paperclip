import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
type Accent = "default" | "indigo" | "emerald" | "amber" | "rose" | "cyan";

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "conductor.theme";
const ACCENT_STORAGE_KEY = "conductor.accent";
const DARK_THEME_COLOR = "#18181b";
const LIGHT_THEME_COLOR = "#ffffff";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ACCENT_OPTIONS: { value: Accent; label: string; color: string }[] = [
  { value: "default", label: "Neutral", color: "#71717a" },
  { value: "indigo", label: "Indigo", color: "#818cf8" },
  { value: "emerald", label: "Emerald", color: "#34d399" },
  { value: "amber", label: "Amber", color: "#fbbf24" },
  { value: "rose", label: "Rose", color: "#fb7185" },
  { value: "cyan", label: "Cyan", color: "#22d3ee" },
];

function resolveThemeFromDocument(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function resolveAccentFromStorage(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored && ACCENT_OPTIONS.some((o) => o.value === stored)) return stored as Accent;
  } catch {
    // ignore
  }
  return "default";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta instanceof HTMLMetaElement) {
    themeColorMeta.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

function applyAccent(accent: Accent) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (accent === "default") {
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accent);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveThemeFromDocument());
  const [accent, setAccentState] = useState<Accent>(() => resolveAccentFromStorage());

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const setAccent = useCallback((nextAccent: Accent) => {
    setAccentState(nextAccent);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore local storage write failures in restricted environments.
    }
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch {
      // ignore
    }
  }, [accent]);

  const value = useMemo(
    () => ({
      theme,
      accent,
      setTheme,
      setAccent,
      toggleTheme,
    }),
    [theme, accent, setTheme, setAccent, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
