import type { Language } from '../i18n/LanguageContext';

/** Platform-supplied reference lists (business types, food/menu categories, event
 * types, provinces, districts, facilities) carry both a nameEn and nameAr — unlike
 * a restaurant's own bilingual content (dish/event titles), which is always shown
 * in both languages together, these should follow whichever language the UI is
 * currently in. */
export function localizedName(item: { nameEn: string; nameAr: string }, language: Language): string {
  return language === 'ar' ? item.nameAr : item.nameEn;
}
