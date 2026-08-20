import type { Language } from './LanguageContext';

const STORAGE_KEY = 'partner-app-language';

export async function getStoredLanguage(): Promise<Language | null> {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'en' || value === 'ar' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: Language): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // storage unavailable — preference still applies for this session
  }
}
