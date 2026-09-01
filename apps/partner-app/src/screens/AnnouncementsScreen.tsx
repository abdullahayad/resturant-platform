import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ChevronDown, ChevronRight, Clock, Inbox, XCircle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { useAuth } from '../lib/AuthContext';
import { api, type Announcement, type RestaurantDetail } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { radii } from '../theme/tokens';

export function AnnouncementsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation('announcements');
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>

      <PublishReviewSection />
      <AnnouncementsSection />
    </ScrollView>
  );
}

// Shared table chrome — column header row + the vertical dividers between
// body rows — reused by both sections so they read as one consistent table
// layout even though their row data comes from different endpoints.
function TableHeader() {
  const { colors } = useTheme();
  const { t } = useTranslation('announcements');
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.tableHeader}>
      <View style={styles.chevronCell} />
      <Text style={[styles.columnLabel, styles.subjectCell]}>{t('columnSubject')}</Text>
      <Text style={[styles.columnLabel, styles.dateCell]}>{t('columnDate')}</Text>
      <Text style={[styles.columnLabel, styles.statusCell]}>{t('columnStatus')}</Text>
    </View>
  );
}

function AnnouncementsSection() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('announcements');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('announcementsSectionTitle')}</Text>

      {announcements === null ? (
        <LoadingState />
      ) : announcements.length === 0 ? (
        <EmptyState icon={Inbox} message={t('noAnnouncementsYet')} />
      ) : (
        <View style={styles.table}>
          <TableHeader />
          {announcements.map((a, index) => {
            const expanded = expandedIds.has(a.id);
            return (
              <View key={a.id} style={[styles.tableRowWrap, index > 0 && styles.tableRowDivider]}>
                <Pressable style={styles.tableRow} onPress={() => toggleExpanded(a.id)}>
                  <View style={styles.chevronCell}>
                    {expanded ? (
                      <ChevronDown size={16} color={colors.mutedForeground} />
                    ) : (
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    )}
                  </View>
                  <Text style={[styles.subjectCell, styles.subjectText]} numberOfLines={1}>
                    {a.notification.titleEn}
                  </Text>
                  <Text style={[styles.dateCell, styles.dateText]} numberOfLines={1}>
                    {new Date(a.notification.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.statusCell}>
                    {a.notification.actionRequired && (
                      <View style={[styles.badge, a.acknowledgedAt ? styles.badgeDone : styles.badgeAction]}>
                        <Text style={[styles.badgeText, a.acknowledgedAt && styles.badgeTextDone]}>
                          {a.acknowledgedAt ? t('completed') : t('actionRequired')}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {expanded && (
                  <View style={styles.rowDetail}>
                    <Text style={styles.detailTitleAr}>{a.notification.titleAr}</Text>
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
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PublishReviewSection() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('announcements');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState<RestaurantDetail | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.me(token).then(setProfile).catch(() => {});
  }, [token]);

  useEffect(load, [load]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api.submitForPublish(token);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings:publishReview.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledge = async () => {
    setAcknowledging(true);
    try {
      const updated = await api.acknowledgePublishDecline(token);
      setProfile(updated);
    } finally {
      setAcknowledging(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('publishReviewSectionTitle')}</Text>
        <LoadingState />
      </View>
    );
  }

  const isDeclinedUnacknowledged = profile.publishStatus === 'REJECTED' && !profile.publishDeclineAcknowledgedAt;
  const StatusIcon =
    profile.publishStatus === 'PENDING' ? Clock : profile.publishStatus === 'APPROVED' ? CheckCircle : XCircle;
  const rowTitle =
    profile.publishStatus === 'NOT_SUBMITTED'
      ? t('settings:publishReview.notSubmittedTitle')
      : profile.publishStatus === 'PENDING'
        ? t('settings:publishReview.pendingTitle')
        : profile.publishStatus === 'APPROVED'
          ? t('settings:publishReview.approvedTitle')
          : t('settings:publishReview.rejectedTitle');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('publishReviewSectionTitle')}</Text>

      <View style={styles.table}>
        <TableHeader />
        <View style={styles.tableRowWrap}>
          <Pressable style={styles.tableRow} onPress={() => setExpanded((v) => !v)}>
            <View style={styles.chevronCell}>
              {expanded ? (
                <ChevronDown size={16} color={colors.mutedForeground} />
              ) : (
                <ChevronRight size={16} color={colors.mutedForeground} />
              )}
            </View>
            <Text style={[styles.subjectCell, styles.subjectText]} numberOfLines={1}>
              {rowTitle}
            </Text>
            <Text style={[styles.dateCell, styles.dateText]} numberOfLines={1}>
              {profile.publishSubmittedAt ? new Date(profile.publishSubmittedAt).toLocaleDateString() : '—'}
            </Text>
            <View style={styles.statusCell}>
              {profile.publishStatus === 'REJECTED' && (
                <View style={[styles.badge, isDeclinedUnacknowledged ? styles.badgeAction : styles.badgeDone]}>
                  <Text style={[styles.badgeText, !isDeclinedUnacknowledged && styles.badgeTextDone]}>
                    {isDeclinedUnacknowledged ? t('actionRequired') : t('completed')}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          {expanded && (
            <View style={styles.rowDetail}>
              <View style={styles.statusIconRow}>
                <View
                  style={[
                    styles.statusIconBadge,
                    {
                      backgroundColor:
                        profile.publishStatus === 'PENDING'
                          ? colors.primaryTint15
                          : profile.publishStatus === 'APPROVED'
                            ? colors.successTint15
                            : profile.publishStatus === 'REJECTED'
                              ? colors.destructiveTint15
                              : colors.secondary,
                    },
                  ]}
                >
                  {profile.publishStatus !== 'NOT_SUBMITTED' && (
                    <StatusIcon
                      size={16}
                      color={
                        profile.publishStatus === 'PENDING'
                          ? colors.primary
                          : profile.publishStatus === 'APPROVED'
                            ? colors.success
                            : colors.destructive
                      }
                    />
                  )}
                </View>
                <Text style={styles.body}>
                  {profile.publishStatus === 'NOT_SUBMITTED' && t('settings:publishReview.notSubmittedHint')}
                  {profile.publishStatus === 'PENDING' && t('settings:publishReview.pendingBody')}
                  {profile.publishStatus === 'APPROVED' && t('settings:publishReview.approvedBody')}
                  {profile.publishStatus === 'REJECTED' && t('settings:publishReview.rejectedBody')}
                </Text>
              </View>

              {profile.publishStatus === 'REJECTED' && profile.publishRejectionReason && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>{t('settings:publishReview.reason')}</Text>
                  <Text style={styles.reasonText}>{profile.publishRejectionReason}</Text>
                </View>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              {profile.publishStatus === 'NOT_SUBMITTED' && (
                <Pressable style={[styles.button, styles.primaryButton]} onPress={submit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('settings:publishReview.submitButton')}</Text>
                  )}
                </Pressable>
              )}

              {profile.publishStatus === 'REJECTED' && (
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.button, styles.primaryButton, styles.inlineButton]}
                    onPress={submit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('settings:publishReview.resubmitButton')}</Text>
                    )}
                  </Pressable>
                  {isDeclinedUnacknowledged && (
                    <Pressable
                      style={[styles.button, styles.secondaryButton, styles.inlineButton]}
                      onPress={acknowledge}
                      disabled={acknowledging}
                    >
                      {acknowledging ? (
                        <ActivityIndicator color={colors.foreground} />
                      ) : (
                        <Text style={styles.secondaryButtonText}>{t('markAsDone')}</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { gap: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '600', color: colors.foreground },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },

  table: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  columnLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase' },
  tableRowWrap: {},
  tableRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  chevronCell: { width: 20 },
  subjectCell: { flex: 1 },
  subjectText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  dateCell: { width: 76 },
  dateText: { fontSize: 11, color: colors.mutedForeground },
  statusCell: { width: 96, alignItems: 'flex-end' },

  rowDetail: { paddingHorizontal: 12, paddingBottom: 14, gap: 6 },
  detailTitleAr: { fontSize: 14, color: colors.mutedForeground, marginStart: 20 },

  statusIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusIconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeAction: { backgroundColor: colors.primaryTint15 },
  badgeDone: { backgroundColor: colors.successTint15 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  badgeTextDone: { color: colors.success },
  body: { fontSize: 14, color: colors.foreground, flex: 1 },
  bodyAr: { fontSize: 13, color: colors.mutedForeground, marginStart: 20 },
  date: { fontSize: 11, color: colors.mutedForeground, marginStart: 20 },
  error: { color: colors.destructive, fontSize: 13 },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', alignSelf: 'flex-start', marginTop: 4 },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 13 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8 },
  inlineButton: { marginTop: 4 },

  reasonBox: {
    marginStart: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  reasonLabel: { fontSize: 12, color: colors.mutedForeground },
  reasonText: { fontSize: 13, color: colors.foreground, marginTop: 4 },
});
