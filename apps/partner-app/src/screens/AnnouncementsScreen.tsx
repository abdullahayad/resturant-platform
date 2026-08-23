import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type Announcement } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { radii, cardShadow } from '../theme/tokens';

export function AnnouncementsScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('announcements');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const markedRead = useRef(false);

  const load = useCallback(() => {
    markedRead.current = false;
    api.announcements(token).then(setAnnouncements).catch(() => setAnnouncements([]));
  }, [token]);

  useEffect(load, [load]);

  // Visiting this screen counts as having seen whatever's currently unread —
  // runs once per fresh load, not on every local state update below.
  useEffect(() => {
    if (!announcements || markedRead.current) return;
    markedRead.current = true;
    const unread = announcements.filter((a) => !a.readAt);
    if (unread.length === 0) return;
    unread.forEach((a) => {
      api.markAnnouncementRead(token, a.notification.id).catch(() => {});
    });
    setAnnouncements((prev) =>
      prev ? prev.map((a) => (a.readAt ? a : { ...a, readAt: new Date().toISOString() })) : prev,
    );
  }, [announcements, token]);

  const acknowledge = async (notificationId: string) => {
    setBusyId(notificationId);
    try {
      const updated = await api.markAnnouncementAcknowledged(token, notificationId);
      setAnnouncements((prev) =>
        prev ? prev.map((a) => (a.notification.id === notificationId ? updated : a)) : prev,
      );
    } finally {
      setBusyId(null);
    }
  };

  if (announcements === null) {
    return <LoadingState />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.subtitle}>{t('subtitle')}</Text>

      {announcements.map((a) => (
        <View key={a.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{a.notification.titleEn}</Text>
            {a.notification.actionRequired && (
              <View style={[styles.badge, a.acknowledgedAt ? styles.badgeDone : styles.badgeAction]}>
                <Text style={[styles.badgeText, a.acknowledgedAt && styles.badgeTextDone]}>
                  {a.acknowledgedAt ? t('completed') : t('actionRequired')}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitleAr}>{a.notification.titleAr}</Text>
          <Text style={styles.body}>{a.notification.bodyEn}</Text>
          <Text style={styles.bodyAr}>{a.notification.bodyAr}</Text>
          <Text style={styles.date}>{new Date(a.notification.createdAt).toLocaleString()}</Text>

          {a.notification.actionRequired && !a.acknowledgedAt && (
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => acknowledge(a.notification.id)}
              disabled={busyId === a.notification.id}
            >
              {busyId === a.notification.id ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('markAsDone')}</Text>
              )}
            </Pressable>
          )}
        </View>
      ))}

      {announcements.length === 0 && <EmptyState icon={Inbox} message={t('noAnnouncementsYet')} />}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8 },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 4,
    ...cardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, flex: 1 },
  cardTitleAr: { fontSize: 14, color: colors.mutedForeground },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeAction: { backgroundColor: colors.primaryTint15 },
  badgeDone: { backgroundColor: colors.successTint15 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  badgeTextDone: { color: colors.success },
  body: { fontSize: 14, color: colors.foreground, marginTop: 6 },
  bodyAr: { fontSize: 13, color: colors.mutedForeground },
  date: { fontSize: 11, color: colors.mutedForeground, marginTop: 6 },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', alignSelf: 'flex-start', marginTop: 8 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 13 },
});
