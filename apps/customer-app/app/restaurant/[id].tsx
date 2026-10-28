import { router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Star,
  Utensils,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  I18nManager,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { EventBookingSheet } from '../../src/components/EventBookingSheet';
import { EventCard } from '../../src/components/EventCard';
import { api, type EventItem, type MenuDish, type Named, type RestaurantPage } from '../../src/lib/api';
import { baghdadNow, formatIqd, isOpenNow, toWhatsAppNumber } from '../../src/lib/format';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors } from '../../src/theme';

type Section = 'menu' | 'photos' | 'reviews' | 'info';
const SECTIONS: Section[] = ['menu', 'photos', 'reviews', 'info'];

// The public web page for the same restaurant - what Share sends, so it
// opens for anyone, with or without the app.
const WEB_PAGE = 'https://api.ligeta.app/restaurant/';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { days, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';
  const name = (x: Named) => (ar ? x.nameAr : x.nameEn);

  const [page, setPage] = useState<RestaurantPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [section, setSection] = useState<Section>('menu');
  const [viewer, setViewer] = useState<string | null>(null);
  const [booking, setBooking] = useState<EventItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .restaurantPage(id)
      .then((p) => {
        if (!cancelled) setPage(p);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    api
      .events({ restaurantId: id })
      .then((e) => {
        if (!cancelled) setEvents(e.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const menu = useMemo(() => groupMenu(page?.dishes ?? []), [page]);

  if (!page) {
    return (
      <SafeAreaView style={styles.center}>
        {failed ? (
          <>
            <AppText weight="bold" style={styles.emptyTitle}>
              {t('restaurant.notFound')}
            </AppText>
            <Pressable style={styles.backPlain} onPress={() => router.back()} accessibilityRole="button">
              <AppText weight="bold" style={{ color: colors.orange }}>
                {t('restaurant.back')}
              </AppText>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.orange} size="large" />
        )}
      </SafeAreaView>
    );
  }

  const photos = page.galleryPhotos.filter((p) => p.album !== 'MENU');
  const menuPhotos = page.galleryPhotos.filter((p) => p.album === 'MENU');
  const cover = page.galleryPhotos.find((p) => p.album === 'FOOD' || p.album === 'AMBIENCE')?.url ?? photos[0]?.url;
  const open = isOpenNow(page.openingHours);
  const today = page.openingHours.find((h) => h.dayOfWeek === baghdadNow().day);
  const whatsapp = toWhatsAppNumber(page.phone);
  const hasLocation = page.latitude != null && page.longitude != null;
  const place = [page.district, page.province].filter((x): x is Named => !!x).map(name).join(' · ');
  const Back = I18nManager.isRTL ? ChevronRight : ChevronLeft;

  const share = () =>
    Share.share({ message: `${name(page)} - LiGETA\n${WEB_PAGE}${page.id}` }).catch(() => {});

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} stickyHeaderIndices={[2]}>
        <View>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.hero, styles.noHero]}>
              <Utensils size={48} color={colors.orange} strokeWidth={1.4} />
            </View>
          )}
          <View style={[styles.heroButtons, { top: insets.top + 8 }]}>
            <Pressable style={styles.round} onPress={() => router.back()} accessibilityLabel={t('restaurant.back')}>
              <Back size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.round} onPress={share} accessibilityLabel={t('restaurant.share')}>
              <Share2 size={19} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            {page.logoUrl && <Image source={{ uri: page.logoUrl }} style={styles.logo} />}
            <View style={styles.titleText}>
              <View style={styles.nameRow}>
                <AppText weight="bold" style={styles.name}>
                  {name(page)}
                </AppText>
                {page.isVerified && <BadgeCheck size={20} color={colors.blue} />}
              </View>
              <AppText style={styles.muted} numberOfLines={2}>
                {page.foodCategories.map((f) => name(f.foodCategory)).join(' · ')}
              </AppText>
            </View>
            {page.overallAverage != null && (
              <Pressable style={styles.rating} onPress={() => setSection('reviews')} accessibilityRole="button">
                <View style={styles.ratingTop}>
                  <Star size={14} color={colors.white} fill={colors.white} />
                  <AppText weight="bold" style={styles.ratingValue}>
                    {page.overallAverage.toFixed(1)}
                  </AppText>
                </View>
                <AppText style={styles.ratingCount}>{t('explore.reviews', { n: page.totalReviews })}</AppText>
              </Pressable>
            )}
          </View>

          {!!place && (
            <View style={styles.fact}>
              <MapPin size={15} color={colors.mutedIcon} />
              <AppText style={styles.factText}>
                {place}
                {page.chain ? ` · ${t('restaurant.partOf', { chain: name(page.chain) })}` : ''}
              </AppText>
            </View>
          )}
          {open != null && (
            <View style={styles.fact}>
              <Clock size={15} color={colors.mutedIcon} />
              <AppText weight="semibold" style={[styles.factText, { color: open ? colors.green : colors.red }]}>
                {open ? t('explore.openNow') : t('explore.closed')}
              </AppText>
              {today && !today.isClosed && today.openTime && today.closeTime && (
                <AppText style={styles.factText}>
                  {`· ${timeLabel(today.openTime)} - ${timeLabel(today.closeTime)}`}
                </AppText>
              )}
            </View>
          )}

          {events.length > 0 && (
            <View style={styles.block}>
              <AppText weight="bold" style={styles.blockTitle}>
                {t('restaurant.events')}
              </AppText>
              {events.map((e) => (
                <EventCard key={e.id} event={e} showRestaurant={false} onBook={() => setBooking(e)} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.tabs}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s}
              style={[styles.tab, section === s && styles.tabActive]}
              onPress={() => setSection(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === s }}
            >
              <AppText weight={section === s ? 'bold' : 'medium'} style={[styles.tabText, section === s && styles.tabTextActive]}>
                {t(`restaurant.sections.${s}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.content}>
          {section === 'menu' &&
            (menu.length === 0 ? (
              <AppText style={styles.emptyText}>{t('restaurant.noMenu')}</AppText>
            ) : (
              menu.map((group) => (
                <View key={group.key} style={styles.menuGroup}>
                  <AppText weight="bold" style={styles.groupTitle}>
                    {group.key === 'popular'
                      ? t('restaurant.mostOrdered')
                      : group.category
                        ? name(group.category)
                        : t('restaurant.otherDishes')}
                  </AppText>
                  {group.dishes.map((d) => (
                    <DishRow key={`${group.key}-${d.id}`} dish={d} name={name(d)} onPhoto={setViewer} />
                  ))}
                </View>
              ))
            ))}

          {section === 'photos' &&
            (photos.length + menuPhotos.length === 0 ? (
              <AppText style={styles.emptyText}>{t('restaurant.noPhotos')}</AppText>
            ) : (
              <>
                <PhotoGrid urls={photos.map((p) => p.url)} onOpen={setViewer} />
                {menuPhotos.length > 0 && (
                  <>
                    <AppText weight="bold" style={styles.groupTitle}>
                      {t('restaurant.menuPhotos')}
                    </AppText>
                    <PhotoGrid urls={menuPhotos.map((p) => p.url)} onOpen={setViewer} />
                  </>
                )}
              </>
            ))}

          {section === 'reviews' &&
            (page.reviews.length === 0 ? (
              <AppText style={styles.emptyText}>{t('restaurant.noReviews')}</AppText>
            ) : (
              page.reviews.map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewTop}>
                    <AppText weight="bold" style={styles.reviewer}>
                      {r.reviewerName}
                    </AppText>
                    <AppText style={styles.stars}>{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</AppText>
                  </View>
                  {!!r.text && <AppText style={styles.reviewText}>{r.text}</AppText>}
                  {r.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewPhotos}>
                      {r.photos.map((p) => (
                        <Pressable key={p.id} onPress={() => setViewer(p.url)}>
                          <Image source={{ uri: p.url }} style={styles.reviewPhoto} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                  {r.reply && (
                    <View style={styles.reply}>
                      <AppText weight="semibold" style={styles.replyLabel}>
                        {t('restaurant.ownerReply')}
                      </AppText>
                      <AppText style={styles.reviewText}>{r.reply.text}</AppText>
                    </View>
                  )}
                </View>
              ))
            ))}

          {section === 'info' && (
            <>
              {page.openingHours.length > 0 && (
                <>
                  <AppText weight="bold" style={styles.groupTitle}>
                    {t('restaurant.hours')}
                  </AppText>
                  <View style={styles.card}>
                    {[...page.openingHours]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((h) => (
                        <View key={h.dayOfWeek} style={styles.hoursRow}>
                          <AppText weight={h.dayOfWeek === baghdadNow().day ? 'bold' : 'regular'}>
                            {days[h.dayOfWeek]}
                          </AppText>
                          <AppText style={styles.muted}>
                            {h.isClosed || !h.openTime || !h.closeTime
                              ? t('explore.closed')
                              : `${timeLabel(h.openTime)} - ${timeLabel(h.closeTime)}`}
                          </AppText>
                        </View>
                      ))}
                  </View>
                </>
              )}
              {page.facilities.length > 0 && (
                <>
                  <AppText weight="bold" style={styles.groupTitle}>
                    {t('restaurant.facilities')}
                  </AppText>
                  <View style={styles.chips}>
                    {page.facilities.map((f) => (
                      <View key={f.facility.nameEn} style={styles.chip}>
                        <AppText style={styles.chipText}>
                          {f.facility.icon ? `${f.facility.icon} ` : ''}
                          {name(f.facility)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {page.chefProfiles.length > 0 && (
                <>
                  <AppText weight="bold" style={styles.groupTitle}>
                    {t('restaurant.chefs')}
                  </AppText>
                  {page.chefProfiles.map((c) => (
                    <View key={c.id} style={[styles.card, styles.chef]}>
                      {c.photoUrl ? (
                        <Image source={{ uri: c.photoUrl }} style={styles.chefPhoto} />
                      ) : (
                        <View style={[styles.chefPhoto, styles.noHero]}>
                          <AppText style={{ fontSize: 26 }}>👨‍🍳</AppText>
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText weight="bold">{c.name}</AppText>
                        <AppText style={styles.muted}>
                          {t(`restaurant.chefRole.${c.role}`)}
                          {c.yearsExperience ? ` · ${t('restaurant.years', { n: c.yearsExperience })}` : ''}
                        </AppText>
                        {!!c.speciality && <AppText style={styles.muted}>{c.speciality}</AppText>}
                        {c.signatureDishes.length > 0 && (
                          <AppText style={styles.signature}>
                            {t('restaurant.signature')}: {c.signatureDishes.map((s) => name(s.dish)).join('، ')}
                          </AppText>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 10 }]}>
        <ActionButton icon={Phone} label={t('restaurant.call')} onPress={() => Linking.openURL(`tel:${page.phone}`)} />
        {whatsapp && (
          <ActionButton
            icon={MessageCircle}
            label={t('restaurant.whatsapp')}
            onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}
          />
        )}
        {hasLocation && (
          <ActionButton
            icon={Navigation}
            label={t('restaurant.directions')}
            primary
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${page.latitude},${page.longitude}`,
              )
            }
          />
        )}
      </View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" />}
          <Pressable
            style={[styles.round, styles.viewerClose, { top: insets.top + 12 }]}
            onPress={() => setViewer(null)}
            accessibilityLabel={t('home.close')}
          >
            <X size={22} color={colors.text} />
          </Pressable>
        </View>
      </Modal>

      {booking && <EventBookingSheet event={booking} onClose={() => setBooking(null)} />}
    </View>
  );
}

interface MenuGroup {
  key: string;
  category: Named | null;
  dishes: MenuDish[];
}

// "Most ordered" first, then the restaurant's menu categories in the
// admin-set order, then anything without a category.
function groupMenu(dishes: MenuDish[]): MenuGroup[] {
  const groups: MenuGroup[] = [];
  const popular = dishes.filter((d) => d.isMostOrdered);
  if (popular.length) groups.push({ key: 'popular', category: null, dishes: popular });
  const byCategory = new Map<string, MenuGroup & { order: number }>();
  for (const d of dishes) {
    const key = d.menuCategory?.id ?? 'other';
    const group = byCategory.get(key) ?? {
      key,
      category: d.menuCategory,
      dishes: [],
      order: d.menuCategory?.sortOrder ?? Number.MAX_SAFE_INTEGER,
    };
    group.dishes.push(d);
    byCategory.set(key, group);
  }
  return [...groups, ...[...byCategory.values()].sort((a, b) => a.order - b.order)];
}

function DishRow({ dish, name, onPhoto }: { dish: MenuDish; name: string; onPhoto: (url: string) => void }) {
  return (
    <View style={styles.dish}>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText weight="semibold" style={styles.dishName}>
          {name}
        </AppText>
        <View style={styles.priceRow}>
          {dish.discountedPrice != null ? (
            <>
              <AppText weight="bold" style={[styles.price, { color: colors.orangeDark }]}>
                {formatIqd(dish.discountedPrice)} IQD
              </AppText>
              <AppText style={styles.oldPrice}>{formatIqd(dish.price)}</AppText>
            </>
          ) : (
            <AppText weight="bold" style={styles.price}>
              {formatIqd(dish.price)} IQD
            </AppText>
          )}
        </View>
      </View>
      {dish.photoUrl && (
        <Pressable onPress={() => onPhoto(dish.photoUrl!)}>
          <Image source={{ uri: dish.photoUrl }} style={styles.dishPhoto} />
        </Pressable>
      )}
    </View>
  );
}

function PhotoGrid({ urls, onOpen }: { urls: string[]; onOpen: (url: string) => void }) {
  return (
    <View style={styles.grid}>
      {urls.map((url) => (
        <Pressable key={url} style={styles.gridItem} onPress={() => onOpen(url)}>
          <Image source={{ uri: url }} style={styles.gridImage} />
        </Pressable>
      ))}
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  primary,
}: {
  icon: typeof Phone;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable style={[styles.action, primary && styles.actionPrimary]} onPress={onPress} accessibilityRole="button">
      <Icon size={18} color={primary ? colors.white : colors.orangeDark} />
      <AppText weight="bold" style={[styles.actionText, primary && { color: colors.white }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
  emptyTitle: { fontSize: 18 },
  backPlain: { padding: 10 },
  hero: { width: '100%', height: 250, backgroundColor: colors.surface },
  noHero: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  heroButtons: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 16, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  titleText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 23, flexShrink: 1 },
  muted: { fontSize: 13.5, color: colors.muted },
  rating: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  ratingTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { color: colors.white, fontSize: 16 },
  ratingCount: { color: colors.white, fontSize: 10.5 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  factText: { fontSize: 13.5, color: colors.muted },
  block: { marginTop: 10, gap: 10 },
  blockTitle: { fontSize: 18 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.orange },
  tabText: { fontSize: 14.5, color: colors.muted },
  tabTextActive: { color: colors.orangeDark },
  content: { padding: 16, gap: 10 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 30 },
  menuGroup: { gap: 2, marginBottom: 8 },
  groupTitle: { fontSize: 17, marginTop: 6, marginBottom: 4 },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dishName: { fontSize: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 14 },
  oldPrice: { fontSize: 12.5, color: colors.muted, textDecorationLine: 'line-through' },
  dishPhoto: { width: 76, height: 76, borderRadius: 14, backgroundColor: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  gridItem: { width: '33.333%', padding: 3 },
  gridImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.surface },
  review: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12, gap: 6 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewer: { fontSize: 15 },
  stars: { color: colors.orange, fontSize: 15, letterSpacing: 1 },
  reviewText: { fontSize: 14, lineHeight: 21 },
  reviewPhotos: { gap: 6 },
  reviewPhoto: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.surface },
  reply: { backgroundColor: colors.surface, borderRadius: 12, padding: 10, gap: 2 },
  replyLabel: { fontSize: 12.5, color: colors.orangeDark },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13 },
  chef: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  chefPhoto: { width: 60, height: 60, borderRadius: 30 },
  signature: { fontSize: 12.5, color: colors.orangeDark },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPrimary: { backgroundColor: colors.orange },
  actionText: { fontSize: 14, color: colors.orangeDark },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 16 },
});
