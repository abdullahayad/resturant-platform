import { router } from 'expo-router';
import { Star, Utensils, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RestaurantCard as Card } from '../lib/api';
import { placeForProvince } from '../lib/prayerTimes';
import { colors, TAB_BAR_SPACE } from '../theme';
import { AppText } from './AppText';

// Explore's map view: the same results as the list, as pins. Tapping a pin
// shows a small card; tapping the card opens the restaurant. Android uses
// Google Maps (key in app.config.js), iPhone uses Apple Maps.
export function ExploreMap({
  restaurants,
  point,
  provinceNameEn,
  total,
}: {
  restaurants: Card[];
  point: { lat: number; lng: number } | null;
  provinceNameEn?: string | null;
  total: number;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const ar = i18n.language === 'ar';
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Card | null>(null);

  const pins = useMemo(
    () => restaurants.filter((r): r is Card & { latitude: number; longitude: number } => r.latitude != null && r.longitude != null),
    [restaurants],
  );

  // Start on the customer (near me) or the chosen province, then fit the pins.
  const start = point ?? placeForProvince(provinceNameEn);
  const initialRegion: Region = {
    latitude: start.lat,
    longitude: start.lng,
    latitudeDelta: point ? 0.06 : 0.25,
    longitudeDelta: point ? 0.06 : 0.25,
  };

  useEffect(() => {
    if (!pins.length) return;
    const coords = pins.map((r) => ({ latitude: r.latitude, longitude: r.longitude }));
    if (point) coords.push({ latitude: point.lat, longitude: point.lng });
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 50, bottom: TAB_BAR_SPACE + 140, left: 50 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [pins, point]);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={!!point}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
      >
        {pins.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            pinColor={selected?.id === r.id ? colors.navy : colors.orange}
            onPress={(e) => {
              e.stopPropagation();
              setSelected(r);
            }}
            accessibilityLabel={ar ? r.nameAr : r.nameEn}
          />
        ))}
      </MapView>

      {pins.length < total && (
        <View style={styles.note} pointerEvents="none">
          <AppText weight="medium" style={styles.noteText}>
            {t('explore.mapShowing', { n: pins.length, total })}
          </AppText>
        </View>
      )}

      {selected && (
        <Pressable
          style={[styles.card, { bottom: insets.bottom + TAB_BAR_SPACE + 4 }]}
          onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: selected.id } })}
          accessibilityRole="button"
        >
          {selected.coverPhotoUrl || selected.logoUrl ? (
            <Image source={{ uri: (selected.coverPhotoUrl ?? selected.logoUrl)! }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Utensils size={22} color={colors.orange} />
            </View>
          )}
          <View style={styles.cardText}>
            <AppText weight="bold" style={styles.name} numberOfLines={1}>
              {ar ? selected.nameAr : selected.nameEn}
            </AppText>
            <AppText style={styles.meta} numberOfLines={1}>
              {selected.foodCategories
                .slice(0, 2)
                .map((c) => (ar ? c.nameAr : c.nameEn))
                .join(' · ')}
            </AppText>
            <View style={styles.row}>
              {selected.rating != null && (
                <View style={styles.rating}>
                  <Star size={11} color={colors.white} fill={colors.white} />
                  <AppText weight="bold" style={styles.ratingText}>
                    {selected.rating.toFixed(1)}
                  </AppText>
                </View>
              )}
              {selected.isOpenNow != null && (
                <AppText weight="semibold" style={[styles.meta, { color: selected.isOpenNow ? colors.green : colors.muted }]}>
                  {selected.isOpenNow ? t('explore.openNow') : t('explore.closed')}
                </AppText>
              )}
              {selected.distanceKm != null && <AppText style={styles.meta}>{t('offers.km', { n: selected.distanceKm })}</AppText>}
            </View>
          </View>
          <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityLabel={t('home.close')}>
            <X size={18} color={colors.mutedIcon} />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  note: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  noteText: { fontSize: 12.5, color: colors.text },
  card: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    shadowColor: colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  photo: { width: 68, height: 68, borderRadius: 12, backgroundColor: colors.surface },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peach },
  cardText: { flex: 1, gap: 3 },
  name: { fontSize: 15.5 },
  meta: { fontSize: 12.5, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.green, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  ratingText: { fontSize: 11.5, color: colors.white },
});
