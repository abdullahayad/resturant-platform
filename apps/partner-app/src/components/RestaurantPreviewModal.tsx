import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { UtensilsCrossed, ImageOff, ChefHat, CalendarClock, SignalHigh, Wifi, BatteryFull } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { localizedName } from '../lib/localizedName';
import { useAuth } from '../lib/AuthContext';
import { api, type MasterDataItem, type RestaurantPreview } from '../lib/api';
import { StarRating } from './StarRating';
import { EmptyState } from './EmptyState';

interface RestaurantPreviewModalProps {
  visible: boolean;
  onClose: () => void;
}

// Same fixed-position overlay trick as LegalDocumentModal — RN's <Modal>
// doesn't reliably sit on top of page content on react-native-web.
const backdropStyle: ViewStyle = { position: 'fixed' as ViewStyle['position'] };

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function RestaurantPreviewModal({ visible, onClose }: RestaurantPreviewModalProps) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation('preview');
  const { t: tCommon } = useTranslation('common');
  const { t: tChef } = useTranslation('chefManagement');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [data, setData] = useState<RestaurantPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    // Re-fetch on every open instead of caching - the whole point of this
    // screen is showing whatever was just saved elsewhere, not a stale copy.
    setData(null);
    setLoadError(null);
    api
      .myPreview(token)
      .then(setData)
      .catch(() => setLoadError(t('loadFailed')));
  }, [visible, token, t]);

  if (!visible) return null;

  const name = data ? (language === 'ar' ? data.nameAr : data.nameEn) : '';
  const locationLine = data
    ? [data.district, data.province].filter((x): x is MasterDataItem => !!x).map((x) => localizedName(x, language)).join(', ')
    : '';

  const statusBarTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.backdrop, backdropStyle]}>
      <View style={styles.chrome}>
        <View style={styles.flex1}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>{tCommon('actions.close')}</Text>
        </Pressable>
      </View>

      <View style={styles.phoneFrame}>
        <View style={styles.statusBar}>
          <Text style={styles.statusBarTime}>{statusBarTime}</Text>
          <View style={styles.statusBarIcons}>
            <SignalHigh size={13} color={colors.foreground} />
            <Wifi size={13} color={colors.foreground} />
            <BatteryFull size={15} color={colors.foreground} />
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {loadError && <Text style={styles.error}>{loadError}</Text>}
          {!data && !loadError && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {data && (
            <>
              <View style={styles.hero}>
                {data.logoUrl ? (
                  <Image source={{ uri: data.logoUrl }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.imagePlaceholder]} />
                )}
                <View style={styles.flex1}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.code}>{data.codeNumber}</Text>
                  {!!locationLine && <Text style={styles.location}>{locationLine}</Text>}
                  <View style={styles.ratingRow}>
                    <StarRating value={data.overallAverage ?? 0} size={14} />
                    <Text style={styles.ratingText}>
                      {data.totalReviews > 0 ? t('ratingsCount', { count: data.totalReviews }) : t('noRatingsYet')}
                    </Text>
                  </View>
                </View>
              </View>

              {(data.businessTypes.length > 0 || data.foodCategories.length > 0 || data.facilities.length > 0) && (
                <View style={styles.chipsWrap}>
                  {data.businessTypes.map((b) => (
                    <View key={b.businessType.id} style={styles.chip}>
                      <Text style={styles.chipText}>{localizedName(b.businessType, language)}</Text>
                    </View>
                  ))}
                  {data.foodCategories.map((f) => (
                    <View key={f.foodCategory.id} style={styles.chip}>
                      <Text style={styles.chipText}>{localizedName(f.foodCategory, language)}</Text>
                    </View>
                  ))}
                  {data.facilities.map((f) => (
                    <View key={f.facility.id} style={styles.chip}>
                      <Text style={styles.chipText}>{localizedName(f.facility, language)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Section title={t('sections.hours')} colors={colors}>
                {[...data.openingHours]
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((day) => (
                    <View key={day.dayOfWeek} style={styles.hoursRow}>
                      <Text style={styles.hoursDay}>{tCommon(`days.${DAY_KEYS[day.dayOfWeek]}`)}</Text>
                      <Text style={styles.hoursTime}>
                        {day.isClosed ? t('closed') : `${day.openTime ?? ''} – ${day.closeTime ?? ''}`}
                      </Text>
                    </View>
                  ))}
              </Section>

              <Section title={t('sections.menu')} colors={colors}>
                {data.dishes.length === 0 ? (
                  <EmptyState icon={UtensilsCrossed} message={t('noDishesYet')} />
                ) : (
                  <View style={styles.dishGrid}>
                    {data.dishes.map((dish) => (
                      <View key={dish.id} style={styles.dishCard}>
                        {dish.photoUrl ? (
                          <Image source={{ uri: dish.photoUrl }} style={styles.dishImage} />
                        ) : (
                          <View style={[styles.dishImage, styles.imagePlaceholder]} />
                        )}
                        <Text style={styles.dishName} numberOfLines={1}>
                          {language === 'ar' ? dish.nameAr : dish.nameEn}
                        </Text>
                        {dish.discountedPrice != null ? (
                          <View style={styles.discountRow}>
                            <Text style={styles.dishPriceOld}>{Number(dish.price).toLocaleString()} IQD</Text>
                            <Text style={styles.dishPriceNew}>{Number(dish.discountedPrice).toLocaleString()} IQD</Text>
                          </View>
                        ) : (
                          <Text style={styles.dishPrice}>{Number(dish.price).toLocaleString()} IQD</Text>
                        )}
                        {dish.isMostOrdered && <Text style={styles.badge}>{t('mostOrdered')}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </Section>

              <Section title={t('sections.gallery')} colors={colors}>
                {data.galleryPhotos.length === 0 ? (
                  <EmptyState icon={ImageOff} message={t('noPhotosYet')} />
                ) : (
                  <View style={styles.photoGrid}>
                    {data.galleryPhotos.map((photo) => (
                      <Image key={photo.id} source={{ uri: photo.url }} style={styles.photoThumb} />
                    ))}
                  </View>
                )}
              </Section>

              <Section title={t('sections.chefs')} colors={colors}>
                {data.chefProfiles.length === 0 ? (
                  <EmptyState icon={ChefHat} message={t('noChefsYet')} />
                ) : (
                  <View style={styles.stackGap}>
                    {data.chefProfiles.map((chef) => (
                      <View key={chef.id} style={styles.chefCard}>
                        {chef.photoUrl ? (
                          <Image source={{ uri: chef.photoUrl }} style={styles.chefPhoto} />
                        ) : (
                          <View style={[styles.chefPhoto, styles.imagePlaceholder]} />
                        )}
                        <View style={styles.flex1}>
                          <Text style={styles.chefName}>{chef.name}</Text>
                          <Text style={styles.chefRole}>
                            {chef.role === 'HEAD_CHEF' ? tChef('headChef') : tChef('sousChef')}
                          </Text>
                          {!!chef.speciality && <Text style={styles.chefMeta}>{chef.speciality}</Text>}
                          {chef.yearsExperience != null && (
                            <Text style={styles.chefMeta}>{t('yearsExperience', { count: chef.yearsExperience })}</Text>
                          )}
                          {chef.signatureDishes.length > 0 && (
                            <Text style={styles.chefMeta}>
                              {chef.signatureDishes
                                .map((sd) => (language === 'ar' ? sd.dish.nameAr : sd.dish.nameEn))
                                .join(' · ')}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                    {!!data.crewCount && <Text style={styles.hint}>{t('crewOf', { count: data.crewCount })}</Text>}
                  </View>
                )}
              </Section>

              <Section title={t('sections.events')} colors={colors}>
                {data.events.length === 0 ? (
                  <EmptyState icon={CalendarClock} message={t('noEventsYet')} />
                ) : (
                  <View style={styles.stackGap}>
                    {data.events.map((event) => (
                      <View key={event.id} style={styles.eventCard}>
                        {event.photoUrl ? (
                          <Image source={{ uri: event.photoUrl }} style={styles.eventImage} />
                        ) : (
                          <View style={[styles.eventImage, styles.imagePlaceholder]} />
                        )}
                        <View style={styles.flex1}>
                          <Text style={styles.chefName}>{language === 'ar' ? event.titleAr : event.titleEn}</Text>
                          {!!(language === 'ar' ? event.descriptionAr : event.descriptionEn) && (
                            <Text style={styles.chefMeta}>{language === 'ar' ? event.descriptionAr : event.descriptionEn}</Text>
                          )}
                          {event.capacity != null && (
                            <Text style={styles.chefMeta}>{t('upToGuests', { count: event.capacity })}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Section>
            </>
          )}
        </ScrollView>

        <View style={styles.homeIndicatorWrap}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: ThemeColors; children: ReactNode }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  // Both direct children of backdrop (not nested in one extra wrapper) so
  // backdrop's own justifyContent:'center' can center them as a group -
  // percentage heights below only resolve reliably against a parent whose
  // own size is definite, which backdrop is (pinned to all 4 edges) and an
  // auto-sized wrapper View would not be.
  chrome: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  flex1: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeButton: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 12, paddingVertical: 6 },
  closeButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // A stylized phone: dark bezel border, rounded corners, and a fake
  // status bar/home indicator - reads as "a photo of a phone screen"
  // rather than another admin settings panel, regardless of the app's own
  // current theme (the bezel color is fixed, like a real device).
  phoneFrame: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: 36,
    borderWidth: 10,
    borderColor: '#111',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  statusBarTime: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  statusBarIcons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  body: { paddingHorizontal: 20 },
  bodyContent: { gap: 20, paddingTop: 8, paddingBottom: 8 },
  homeIndicatorWrap: { alignItems: 'center', paddingVertical: 8 },
  homeIndicator: { width: 100, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground, opacity: 0.5 },
  error: { color: colors.destructive, fontSize: 13, paddingHorizontal: 20 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.secondary },
  imagePlaceholder: { backgroundColor: colors.secondary },
  name: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  code: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  location: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ratingText: { fontSize: 12, color: colors.mutedForeground },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, color: colors.foreground },

  section: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 12, color: colors.mutedForeground },
  stackGap: { gap: 12 },

  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  hoursDay: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  hoursTime: { fontSize: 13, color: colors.mutedForeground },

  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dishCard: { width: 120 },
  dishImage: { width: 120, height: 90, borderRadius: 10 },
  dishName: { fontSize: 12, fontWeight: '600', color: colors.foreground, marginTop: 4 },
  dishPrice: { fontSize: 11, color: colors.mutedForeground },
  discountRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  dishPriceOld: { fontSize: 10, color: colors.mutedForeground, textDecorationLine: 'line-through' },
  dishPriceNew: { fontSize: 11, fontWeight: '700', color: colors.primary },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.secondary },

  chefCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  chefPhoto: { width: 56, height: 56, borderRadius: 28 },
  chefName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  chefRole: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  chefMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

  eventCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  eventImage: { width: 56, height: 56, borderRadius: 10 },
});
