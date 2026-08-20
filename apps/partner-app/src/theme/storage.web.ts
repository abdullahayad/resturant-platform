import type { Theme } from './ThemeContext';

const STORAGE_KEY = 'partner-app-theme';

export async function getStoredTheme(): Promise<Theme | null> {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredTheme(theme: Theme): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable — theme still applies for this session
  }
}
