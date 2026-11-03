import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { I18nManager } from 'react-native';
import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'ar' | 'en';

const LANGUAGE_KEY = 'ligeta.language';

// Starts from the phone's language (Arabic phones get Arabic, everyone else
// English), until the customer picks one in Profile - see chooseLanguage.
export const deviceLanguage: Language = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';

const i18n = createInstance();

i18n.use(initReactI18next).init({
  lng: deviceLanguage,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  resources: { ar: { translation: ar }, en: { translation: en } },
});

// Applies a language picked earlier in Profile. Called once at startup,
// before the splash screen hides, so the first screen is already right.
export async function loadSavedLanguage(): Promise<void> {
  const saved = await SecureStore.getItemAsync(LANGUAGE_KEY).catch(() => null);
  if ((saved === 'ar' || saved === 'en') && saved !== i18n.language) await i18n.changeLanguage(saved);
}

// Profile's language switch. Arabic is right-to-left, and React Native only
// flips the whole layout direction on a restart - so when the direction
// changes, the app restarts itself into the new language straight away.
export async function chooseLanguage(lang: Language): Promise<void> {
  await SecureStore.setItemAsync(LANGUAGE_KEY, lang).catch(() => {});
  const rtl = lang === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    try {
      await Updates.reloadAsync();
      return;
    } catch {
      // Development builds can't restart this way - switch the text anyway.
    }
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
