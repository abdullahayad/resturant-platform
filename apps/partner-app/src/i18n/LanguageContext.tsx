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

/** Applies the visual/i18n side effects for a language on web — the DOM dir/lang
 * attributes and RNW's I18nManager flag, both of which react-i18next's own
 * language switch does NOT handle for us. Used on both interactive toggle and
 * on rehydrating a stored preference at boot, so neither path can drift from
 * the other (a prior version only did this on toggle, silently staying
 * English/LTR after a reload with a stored Arabic preference). */
function applyWebSideEffects(next: Language) {
  const isRTL = next === 'ar';
  I18nManager.forceRTL(isRTL);
  if (typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    getStoredLanguage().then(async (stored) => {
      const initial = stored ?? 'en';
      await i18n.changeLanguage(initial);
      if (Platform.OS === 'web') applyWebSideEffects(initial);
      setLanguageState(initial);
      setBootstrapped(true);
    });
  }, []);

  const applyLanguage = async (next: Language) => {
    await setStoredLanguage(next);
    await i18n.changeLanguage(next);

    if (Platform.OS === 'web') {
      applyWebSideEffects(next);
      setLanguageState(next);
      return;
    }

    // Native: I18nManager.forceRTL only affects layout after a fresh
    // mount, so persist everything first, then reload the JS runtime.
    const isRTL = next === 'ar';
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

  if (!bootstrapped) return null;

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
