import { router } from 'expo-router';
import { CalendarDays, Clock, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { PagedList } from '../src/components/PagedList';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { api, type BookingStatus, type MyBooking } from '../src/lib/api';
import { baghdadNow } from '../src/lib/format';
import { useDateLabels } from '../src/lib/useDateLabels';
import { colors } from '../src/theme';

const STATUS_COLORS: Record<BookingStatus, { bg: string; fg: string }> = {
  PENDING: { bg: colors.peach, fg: colors.orangeDark },
  CONFIRMED: { bg: colors.greenTint, fg: colors.green },
  CANCELLED: { bg: colors.surface, fg: colors.muted },
  COMPLETED: { bg: colors.blueTint, fg: colors.blue },
};

// When a booking happens, in Baghdad terms: recurring events store the
// calendar day plus the event's usual time, one-off events their own moment.
function bookingWhen(b: MyBooking): { date: string; time: string | null } {
  if (b.event.isRecurring) return { date: b.reservationDate.slice(0, 10), time: b.event.recurringTime };
  const { date, time } = baghdadNow(new Date(b.reservationDate));
  return { date, time };
}

// The customer's event bookings (made with their verified number), newest
// first, with Cancel for ones that haven't happened yet.
export default function BookingsScreen() {
  const { t } = useTranslation();
  // Bumped after a cancel so the list reloads with the new status.
  const [version, setVersion] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('bookings.title')} />
      <PagedList<MyBooking>
        reloadKey={String(version)}
        load={(page) => api.myBookings(page)}
        renderItem={(b) => <BookingCard booking={b} onCancelled={() => setVersion((v) => v + 1)} />}
        emptyTitle={t('bookings.empty')}
        emptyText={t('bookings.emptyText')}
      />
    </SafeAreaView>
  );
}

function BookingCard({ booking: b, onCancelled }: { booking: MyBooking; onCancelled: () => void }) {
  const { t, i18n } = useTranslation();
  const { dateLabel, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';
  const when = bookingWhen(b);
  const upcoming = when.date >= baghdadNow().date;
  const canCancel = upcoming && (b.status === 'PENDING' || b.status === 'CONFIRMED');
  const tone = STATUS_COLORS[b.status];

  const cancel = () =>
    Alert.alert(t('bookings.cancelTitle'), t('bookings.cancelText'), [
      { text: t('bookings.keep'), style: 'cancel' },
      {
        text: t('bookings.cancel'),
        style: 'destructive',
        onPress: () =>
          api
            .cancelBooking(b.id)
            .then(onCancelled)
            .catch(() => Alert.alert(t('explore.errorTitle'), t('bookings.cancelFailed'))),
      },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <AppText weight="semibold" style={styles.type}>
          {b.event.eventType.icon ? `${b.event.eventType.icon} ` : ''}
          {ar ? b.event.eventType.nameAr : b.event.eventType.nameEn}
        </AppText>
        <View style={[styles.status, { backgroundColor: tone.bg }]}>
          <AppText weight="bold" style={[styles.statusText, { color: tone.fg }]}>
            {t(`bookings.status.${b.status}`)}
          </AppText>
        </View>
      </View>
      <AppText weight="bold" style={styles.title}>
        {ar ? b.event.titleAr : b.event.titleEn}
      </AppText>
      <Pressable
        onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: b.restaurant.id } })}
        accessibilityRole="link"
      >
        <AppText weight="semibold" style={styles.restaurant}>
          {ar ? b.restaurant.nameAr : b.restaurant.nameEn}
        </AppText>
      </Pressable>
      <View style={styles.facts}>
        <View style={styles.fact}>
          <CalendarDays size={14} color={colors.mutedIcon} />
          <AppText style={styles.factText}>{dateLabel(when.date)}</AppText>
        </View>
        {when.time && (
          <View style={styles.fact}>
            <Clock size={14} color={colors.mutedIcon} />
            <AppText style={styles.factText}>{timeLabel(when.time)}</AppText>
          </View>
        )}
        <View style={styles.fact}>
          <Users size={14} color={colors.mutedIcon} />
          <AppText style={styles.factText}>{t('bookings.guests', { n: b.partySize })}</AppText>
        </View>
      </View>
      {canCancel && (
        <Pressable style={styles.cancel} onPress={cancel} accessibilityRole="button">
          <AppText weight="bold" style={styles.cancelText}>
            {t('bookings.cancel')}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  type: { fontSize: 12.5, color: colors.blue, flexShrink: 1 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11.5 },
  title: { fontSize: 16.5 },
  restaurant: { fontSize: 13.5, color: colors.orangeDark },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 13, color: colors.muted },
  cancel: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelText: { color: colors.red, fontSize: 13.5 },
});
