import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../src/components/AppText';
import { PagedList } from '../src/components/PagedList';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { api, type InboxNotification } from '../src/lib/api';
import { baghdadNow } from '../src/lib/format';
import { openFromNotification } from '../src/lib/push';
import { useDateLabels } from '../src/lib/useDateLabels';
import { colors } from '../src/theme';

// Every notification the customer received, so a message can be read after
// the phone's banner is gone. Opening this screen marks them all as read.
export default function NotificationsScreen() {
  const { t } = useTranslation();

  useEffect(() => {
    api.markNotificationsRead().catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={t('notifications.title')} />
      <PagedList<InboxNotification>
        load={(page) => api.notifications(page)}
        renderItem={(n) => <NotificationRow notification={n} />}
        emptyTitle={t('notifications.empty')}
        emptyText={t('notifications.emptyText')}
      />
    </SafeAreaView>
  );
}

function NotificationRow({ notification: n }: { notification: InboxNotification }) {
  const { i18n } = useTranslation();
  const { dateLabel, timeLabel } = useDateLabels();
  const ar = i18n.language === 'ar';
  // Read state as it was when the screen opened, so new ones stay marked.
  const [unread] = useState(!n.readAt);
  const when = baghdadNow(new Date(n.createdAt));
  const opensSomething = !!n.data?.screen && n.data.screen !== 'home';

  return (
    <Pressable
      style={[styles.card, unread && styles.unread]}
      onPress={() => opensSomething && openFromNotification(n.data ?? undefined)}
      disabled={!opensSomething}
      accessibilityRole={opensSomething ? 'link' : 'text'}
    >
      <View style={styles.top}>
        <AppText weight="bold" style={styles.title}>
          {ar ? n.titleAr : n.titleEn}
        </AppText>
        {unread && <View style={styles.dot} />}
      </View>
      <AppText style={styles.body}>{ar ? n.bodyAr : n.bodyEn}</AppText>
      <AppText style={styles.date}>
        {dateLabel(when.date)} · {timeLabel(when.time)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  unread: { backgroundColor: colors.peach, borderColor: '#F0C9A8' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15.5, flexShrink: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.orange },
  body: { fontSize: 14, lineHeight: 21 },
  date: { fontSize: 12, color: colors.mutedIcon },
});
