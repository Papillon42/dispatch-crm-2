export type Theme = 'night' | 'day';

export const THEME_STORAGE_KEY = 'dispatch-crm-theme';
export const DEFAULT_THEME: Theme = 'night';

export function isTheme(value: unknown): value is Theme {
  return value === 'night' || value === 'day';
}

/**
 * Inline script source, executed synchronously before hydration (see
 * ThemeScript in app/layout.tsx) so the correct `data-theme` attribute is
 * on <html> before first paint — no flash of the wrong theme.
 */
export function themeInitScript() {
  return `(function() {
    try {
      var key = ${JSON.stringify(THEME_STORAGE_KEY)};
      var stored = localStorage.getItem(key);
      var theme = stored === 'day' || stored === 'night'
        ? stored
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'night');
    }
  })();`;
}
