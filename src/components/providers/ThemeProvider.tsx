'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY, Theme, isTheme } from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The blocking inline script (ThemeScript, rendered in layout.tsx) already
  // set the real `data-theme` attribute on <html> before this component
  // mounts, so we just read it back — no mismatch, no flash.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (isTheme(current)) setThemeState(current);

    // Keep in sync if the OS theme changes and the user hasn't made an explicit choice
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (isTheme(stored)) return; // explicit user choice wins
      const next: Theme = e.matches ? 'day' : 'night';
      document.documentElement.setAttribute('data-theme', next);
      setThemeState(next);
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private browsing etc.) — theme just won't persist
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'night' ? 'day' : 'night');
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
