import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'ar' | 'en';

// Follows the phone: Arabic phones get Arabic (and right-to-left layout,
// which React Native already applies from the device locale), everyone
// else gets English. An in-app switch comes with the Profile screen.
export const deviceLanguage: Language = getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';

const i18n = createInstance();

i18n.use(initReactI18next).init({
  lng: deviceLanguage,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  resources: { ar: { translation: ar }, en: { translation: en } },
});

export default i18n;
