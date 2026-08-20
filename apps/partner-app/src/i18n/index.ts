import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enProfile from './locales/en/profile.json';
import enMenu from './locales/en/menu.json';
import enPromotions from './locales/en/promotions.json';
import enAdvertising from './locales/en/advertising.json';
import enGallery from './locales/en/gallery.json';
import enChefManagement from './locales/en/chefManagement.json';
import enChefTable from './locales/en/chefTable.json';
import enReviews from './locales/en/reviews.json';
import enAnnouncements from './locales/en/announcements.json';
import enSettings from './locales/en/settings.json';
import enPlaceholder from './locales/en/placeholder.json';

import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arAuth from './locales/ar/auth.json';
import arDashboard from './locales/ar/dashboard.json';
import arProfile from './locales/ar/profile.json';
import arMenu from './locales/ar/menu.json';
import arPromotions from './locales/ar/promotions.json';
import arAdvertising from './locales/ar/advertising.json';
import arGallery from './locales/ar/gallery.json';
import arChefManagement from './locales/ar/chefManagement.json';
import arChefTable from './locales/ar/chefTable.json';
import arReviews from './locales/ar/reviews.json';
import arAnnouncements from './locales/ar/announcements.json';
import arSettings from './locales/ar/settings.json';
import arPlaceholder from './locales/ar/placeholder.json';

export const defaultNS = 'common';

i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      common: enCommon,
      nav: enNav,
      auth: enAuth,
      dashboard: enDashboard,
      profile: enProfile,
      menu: enMenu,
      promotions: enPromotions,
      advertising: enAdvertising,
      gallery: enGallery,
      chefManagement: enChefManagement,
      chefTable: enChefTable,
      reviews: enReviews,
      announcements: enAnnouncements,
      settings: enSettings,
      placeholder: enPlaceholder,
    },
    ar: {
      common: arCommon,
      nav: arNav,
      auth: arAuth,
      dashboard: arDashboard,
      profile: arProfile,
      menu: arMenu,
      promotions: arPromotions,
      advertising: arAdvertising,
      gallery: arGallery,
      chefManagement: arChefManagement,
      chefTable: arChefTable,
      reviews: arReviews,
      announcements: arAnnouncements,
      settings: arSettings,
      placeholder: arPlaceholder,
    },
  },
});

export default i18next;
