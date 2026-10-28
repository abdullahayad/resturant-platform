import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { EventBookingSheet } from '../../src/components/EventBookingSheet';
import { EventCard } from '../../src/components/EventCard';
import { PagedList } from '../../src/components/PagedList';
import { api, type EventItem, type EventType } from '../../src/lib/api';
import { addDays, baghdadNow, dayOfMonth, weekdayOf } from '../../src/lib/format';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors } from '../../src/theme';

const STRIP_DAYS = 14;

// Chef's tables, buffets, live music, match nights... across every
// restaurant: pick a day (or all upcoming) and a type, then book seats.
export default function EventsScreen() {
  const { t, i18n } = useTranslation();
  const { days } = useDateLabels();
  const ar = i18n.language === 'ar';
  const [date, setDate] = useState<string | undefined>(undefined);
  const [typeId, setTypeId] = useState<string | undefined>(undefined);
  const [types, setTypes] = useState<EventType[]>([]);
  const [booking, setBooking] = useState<EventItem | null>(null);

  const strip = useMemo(() => {
    const today = baghdadNow().date;
    return Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .eventTypes()
      .then((list) => {
        if (!cancelled) setTypes(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.events')}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          <Pressable
            style={[styles.day, styles.allDays, !date && styles.dayActive]}
            onPress={() => setDate(undefined)}
            accessibilityRole="button"
            accessibilityState={{ selected: !date }}
          >
            <AppText weight="bold" style={[styles.dayNumber, !date && styles.dayTextActive]}>
              {t('events.all')}
            </AppText>
          </Pressable>
          {strip.map((d, i) => {
            const active = date === d;
            return (
              <Pressable
                key={d}
                style={[styles.day, active && styles.dayActive]}
                onPress={() => setDate(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <AppText style={[styles.dayName, active && styles.dayTextActive]} numberOfLines={1}>
                  {i === 0 ? t('dates.today') : days[weekdayOf(d)]}
                </AppText>
                <AppText weight="bold" style={[styles.dayNumber, active && styles.dayTextActive]}>
                  {dayOfMonth(d)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        {types.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ id: '', nameAr: t('events.allTypes'), nameEn: t('events.allTypes'), icon: null }, ...types].map((type) => {
              const active = (typeId ?? '') === type.id;
              return (
                <Pressable
                  key={type.id || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTypeId(type.id || undefined)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppText weight="semibold" style={[styles.chipText, active && styles.chipTextActive]}>
                    {type.icon ? `${type.icon} ` : ''}
                    {ar ? type.nameAr : type.nameEn}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <PagedList<EventItem>
        reloadKey={`${date ?? ''}|${typeId ?? ''}`}
        load={(page) => api.events({ date, eventTypeId: typeId, page })}
        renderItem={(e) => (
          <EventCard
            event={e}
            onBook={() => setBooking(e)}
            onOpenRestaurant={() => router.push({ pathname: '/restaurant/[id]', params: { id: e.restaurant.id } })}
          />
        )}
        emptyTitle={t('events.emptyTitle')}
        emptyText={t('events.emptyText')}
      />

      {booking && <EventBookingSheet event={booking} onClose={() => setBooking(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 8, gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 26, marginHorizontal: 16 },
  strip: { paddingHorizontal: 16, gap: 8 },
  day: {
    width: 58,
    height: 66,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  allDays: { width: 64 },
  dayActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  dayName: { fontSize: 11.5, color: colors.muted },
  dayNumber: { fontSize: 17 },
  dayTextActive: { color: colors.white },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.blueTint, borderColor: colors.blue },
  chipText: { fontSize: 13.5 },
  chipTextActive: { color: colors.blue },
});
