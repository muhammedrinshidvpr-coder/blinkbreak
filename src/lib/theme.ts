import { useEffect, useState } from 'react';
import type { ResolvedTheme, ThemeSetting } from './types';

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function resolveTheme(setting: ThemeSetting, systemDark: boolean): ResolvedTheme {
  if (setting === 'system') return systemDark ? 'dark' : 'light';
  return setting;
}

/** Resolves the theme setting (following Windows live when set to System). */
export function useResolvedTheme(setting: ThemeSetting): ResolvedTheme {
  const [systemDark, setSystemDark] = useState(() => darkQuery()?.matches ?? false);
  useEffect(() => {
    const query = darkQuery();
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return resolveTheme(setting, systemDark);
}

/** Applies a resolved theme to the document (`data-theme` on <html>). */
export function useApplyTheme(theme: ResolvedTheme, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme, enabled]);
}
