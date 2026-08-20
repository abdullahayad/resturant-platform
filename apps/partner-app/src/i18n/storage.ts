import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from './LanguageContext';

const STORAGE_KEY = 'partner-app-language';

export async function getStoredLanguage(): Promise<Language | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'en' || value === 'ar' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // storage unavailable — preference still applies for this session
  }
}
