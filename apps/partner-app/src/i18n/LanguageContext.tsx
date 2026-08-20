import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import i18n from './index';
import { getStoredLanguage, setStoredLanguage } from './storage';

export type Language = 'en' | 'ar';

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    getStoredLanguage().then((stored) => {
      if (stored) setLanguageState(stored);
    });
  }, []);

  const applyLanguage = async (next: Language) => {
    const isRTL = next === 'ar';
    await setStoredLanguage(next);
    await i18n.changeLanguage(next);

    if (Platform.OS === 'web') {
      I18nManager.forceRTL(isRTL);
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = next;
      }
      setLanguageState(next);
      return;
    }

    // Native: I18nManager.forceRTL only affects layout after a fresh
    // mount, so persist everything first, then reload the JS runtime.
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      setLanguageState(next);
      try {
        await Updates.reloadAsync();
      } catch {
        // expo-updates unavailable (e.g. Expo Go) — layout mirrors on next manual restart
      }
      return;
    }

    setLanguageState(next);
  };

  const setLanguage = (next: Language) => {
    applyLanguage(next);
  };

  const toggleLanguage = () => {
    applyLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL: language === 'ar', setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
