import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'newspaper_theme_preference';

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(preference: ThemePreference): boolean {
  return preference === 'system' ? getSystemPrefersDark() : preference === 'dark';
}

function applyThemeClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
}

export function useTheme(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  useEffect(() => {
    applyThemeClass(resolveIsDark(preference));
    localStorage.setItem(STORAGE_KEY, preference);

    if (preference !== 'system') return;

    // Track OS-level changes live while the user is in "system" mode
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyThemeClass(getSystemPrefersDark());
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [preference]);

  return [preference, setPreference];
}
