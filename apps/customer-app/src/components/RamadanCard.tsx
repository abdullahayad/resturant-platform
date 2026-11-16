import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Moon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { api, type RamadanStatus } from '../lib/api';
import { useArea } from '../lib/area';
import { addDays, baghdadNow } from '../lib/format';
import { placeForProvince, prayerTimes, type PrayerMethod } from '../lib/prayerTimes';
import { useDateLabels } from '../lib/useDateLabels';
import { colors } from '../theme';
import { AppText } from './AppText';

const METHOD_KEY = 'ligeta.prayerMethod';

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Ramadan on Home, switched on from the admin portal: a countdown the week
// before, then the day number, a live countdown to iftar (or to the end of
// suhoor), today's times for the chosen area, and shortcuts to iftar
// events and places open for suhoor. Times are worked out on the phone;
// the customer picks Sunni or Shia timing once.
export function RamadanCard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { area } = useArea();
  const { timeLabel } = useDateLabels();
  const [status, setStatus] = useState<RamadanStatus | null>(null);
  const [method, setMethod] = useState<PrayerMethod | null | undefined>(undefined);
  const [, tick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .ramadan()
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    SecureStore.getItemAsync(METHOD_KEY)
      .then((v) => setMethod(v === 'sunni' || v === 'shia' ? v : null))
      .catch(() => setMethod(null));
  }, []);

  // Keeps the countdown current.
  useEffect(() => {
    if (status?.phase !== 'ramadan') return;
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, [status?.phase]);

  const chooseMethod = (m: PrayerMethod) => {
    setMethod(m);
    SecureStore.setItemAsync(METHOD_KEY, m).catch(() => {});
  };

  if (!status || status.phase === 'off' || method === undefined) return null;

  const place = placeForProvince(area?.provinceNameEn);
  const placeName = area ? (ar ? area.provinceNameAr : area.provinceNameEn) : ar ? 'بغداد' : 'Baghdad';
  const now = baghdadNow();

  let headline = '';
  let times: { fajr: string; maghrib: string } | null = null;
  if (status.phase === 'countdown') {
    headline = t('ramadan.startsIn', { count: status.daysUntil });
  } else if (method) {
    times = prayerTimes(now.date, place, method);
    const minute = toMinutes(now.time);
    const fajr = toMinutes(times.fajr);
    const maghrib = toMinutes(times.maghrib);
    const left = (target: number) => {
      const m = target - minute;
      return t('ramadan.hm', { h: Math.floor(m / 60), m: m % 60 });
    };
    if (minute < fajr) headline = t('ramadan.suhoorEndsIn', { time: left(fajr) });
    else if (minute < maghrib) headline = t('ramadan.iftarIn', { time: left(maghrib) });
    else {
      const tomorrow = prayerTimes(addDays(now.date, 1), place, method);
      headline = t('ramadan.iftarNow', { time: timeLabel(tomorrow.fajr) });
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.moon}>
          <Moon size={20} color="#F6D58E" fill="#F6D58E" />
        </View>
        <View style={styles.flex}>
          <AppText weight="bold" style={styles.title}>
            {status.phase === 'ramadan'
              ? t('ramadan.day', { day: status.day, total: status.totalDays })
              : t('ramadan.kareem')}
          </AppText>
          {!!headline && <AppText style={styles.headline}>{headline}</AppText>}
        </View>
      </View>

      {status.phase === 'ramadan' && !method && (
        <View style={styles.choose}>
          <AppText style={styles.chooseText}>{t('ramadan.chooseMethod')}</AppText>
          <View style={styles.row}>
            {(['sunni', 'shia'] as PrayerMethod[]).map((m) => (
              <Pressable key={m} style={styles.methodButton} onPress={() => chooseMethod(m)} accessibilityRole="button">
                <AppText weight="bold" style={styles.methodText}>
                  {t(`ramadan.methods.${m}`)}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {times && (
        <>
          <View style={styles.times}>
            <View style={styles.time}>
              <AppText style={styles.timeLabel}>{t('ramadan.suhoorEnds')}</AppText>
              <AppText weight="bold" style={styles.timeValue}>
                {timeLabel(times.fajr)}
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.time}>
              <AppText style={styles.timeLabel}>{t('ramadan.iftar')}</AppText>
              <AppText weight="bold" style={styles.timeValue}>
                {timeLabel(times.maghrib)}
              </AppText>
            </View>
          </View>
          <View style={styles.footRow}>
            <AppText style={styles.note} numberOfLines={2}>
              {t('ramadan.note', { place: placeName, method: t(`ramadan.methods.${method}`) })}
            </AppText>
            <Pressable onPress={() => chooseMethod(method === 'sunni' ? 'shia' : 'sunni')} hitSlop={8} accessibilityRole="button">
              <AppText weight="semibold" style={styles.switchText}>
                {t('ramadan.switchTo', { method: t(`ramadan.methods.${method === 'sunni' ? 'shia' : 'sunni'}`) })}
              </AppText>
            </Pressable>
          </View>
        </>
      )}

      {(status.iftarEventType || status.suhoorMood) && (
        <View style={styles.row}>
          {status.iftarEventType && (
            <Pressable
              style={styles.shortcut}
              onPress={() => router.navigate({ pathname: '/events', params: { typeId: status.iftarEventType!.id } })}
              accessibilityRole="button"
            >
              <AppText weight="bold" style={styles.shortcutText} numberOfLines={1}>
                {(status.iftarEventType.icon ? status.iftarEventType.icon + ' ' : '') + t('ramadan.iftarPlaces')}
              </AppText>
            </Pressable>
          )}
          {status.suhoorMood && (
            <Pressable
              style={styles.shortcut}
              onPress={() =>
                router.push({
                  pathname: '/explore',
                  params: { moodId: status.suhoorMood!.id, moodName: ar ? status.suhoorMood!.nameAr : status.suhoorMood!.nameEn },
                })
              }
              accessibilityRole="button"
            >
              <AppText weight="bold" style={styles.shortcutText} numberOfLines={1}>
                {status.suhoorMood.emoji + ' ' + t('ramadan.suhoorPlaces')}
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, backgroundColor: '#1F1640', padding: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(246,213,142,0.15)', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontSize: 17, color: colors.white },
  headline: { fontSize: 14, color: '#F6D58E', marginTop: 2 },
  choose: { gap: 8 },
  chooseText: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', gap: 10 },
  methodButton: { flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  methodText: { color: colors.white, fontSize: 14 },
  times: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 10 },
  time: { flex: 1, alignItems: 'center', gap: 2 },
  timeLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)' },
  timeValue: { fontSize: 20, color: colors.white },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  note: { fontSize: 11.5, color: 'rgba(255,255,255,0.6)', flex: 1 },
  switchText: { fontSize: 12, color: '#F6D58E' },
  shortcut: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  shortcutText: { color: colors.white, fontSize: 13.5 },
});
