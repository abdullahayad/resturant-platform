import { router, useLocalSearchParams } from 'expo-router';
import { Award, ThumbsUp, UserCheck, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { api, type CriticProfile } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { baghdadNow } from '../../src/lib/format';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors } from '../../src/theme';

// A critic's public page: level, specialties, numbers, Follow, and their
// reviews (each opens the restaurant).
export default function CriticScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status, customer } = useAuth();
  const { dateLabel } = useDateLabels();
  const ar = i18n.language === 'ar';
  const [critic, setCritic] = useState<CriticProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .critic(id)
      .then((c) => {
        if (!cancelled) setCritic(c);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    if (status === 'signedIn') {
      api
        .followedCritics()
        .then((ids) => {
          if (!cancelled) setFollowing(ids.includes(id));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [id, status]);

  const toggleFollow = async () => {
    if (status !== 'signedIn') {
      router.push('/login');
      return;
    }
    const next = !following;
    setFollowing(next);
    setCritic((c) => (c ? { ...c, followerCount: c.followerCount + (next ? 1 : -1) } : c));
    try {
      await (next ? api.followCritic(id) : api.unfollowCritic(id));
    } catch {
      setFollowing(!next);
      setCritic((c) => (c ? { ...c, followerCount: c.followerCount + (next ? -1 : 1) } : c));
    }
  };

  if (!critic) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={t('critics.title')} />
        <View style={styles.center}>
          {failed ? <AppText style={styles.muted}>{t('critics.notFound')}</AppText> : <ActivityIndicator color={colors.orange} />}
        </View>
      </SafeAreaView>
    );
  }

  const isMe = customer?.id === critic.id;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={critic.name} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <AppText weight="bold" style={styles.avatarText}>
              {critic.name.charAt(0)}
            </AppText>
          </View>
          <View style={styles.badges}>
            {critic.isStar && (
              <View style={[styles.badge, styles.starBadge]}>
                <Award size={14} color={colors.white} />
                <AppText weight="bold" style={styles.badgeTextLight}>
                  {t('critics.star')}
                </AppText>
              </View>
            )}
            <View style={styles.badge}>
              <AppText weight="bold" style={styles.badgeText}>
                {t('profile.level', { n: critic.level })}
              </AppText>
            </View>
          </View>
          {critic.specialties.length > 0 && (
            <AppText style={styles.muted}>
              {critic.specialties.map((s) => `${s.icon ? `${s.icon} ` : ''}${ar ? s.nameAr : s.nameEn}`).join(' · ')}
            </AppText>
          )}
          <View style={styles.stats}>
            {[
              [critic.reviewCount, t('critics.reviews')],
              [critic.helpfulCount, t('critics.helpful')],
              [critic.followerCount, t('critics.followers')],
              [critic.visitCount, t('critics.visits')],
            ].map(([value, label]) => (
              <View key={String(label)} style={styles.stat}>
                <AppText weight="bold" style={styles.statValue}>
                  {value}
                </AppText>
                <AppText style={styles.statLabel}>{label}</AppText>
              </View>
            ))}
          </View>
          {!isMe && (
            <Pressable style={[styles.follow, following && styles.following]} onPress={toggleFollow} accessibilityRole="button">
              {following ? <UserCheck size={18} color={colors.white} /> : <UserPlus size={18} color={colors.orangeDark} />}
              <AppText weight="bold" style={[styles.followText, following && { color: colors.white }]}>
                {following ? t('restaurant.following') : t('restaurant.follow')}
              </AppText>
            </Pressable>
          )}
        </View>

        <AppText weight="bold" style={styles.sectionTitle}>
          {t('critics.theirReviews')}
        </AppText>
        {critic.reviews.length === 0 && <AppText style={styles.muted}>{t('restaurant.noReviews')}</AppText>}
        {critic.reviews.map((r) => (
          <Pressable
            key={r.id}
            style={styles.review}
            onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.restaurant.id } })}
            accessibilityRole="link"
          >
            <View style={styles.reviewTop}>
              <AppText weight="bold" style={styles.restaurant} numberOfLines={1}>
                {ar ? r.restaurant.nameAr : r.restaurant.nameEn}
              </AppText>
              <AppText style={styles.stars}>{'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</AppText>
            </View>
            <AppText style={styles.date}>{dateLabel(baghdadNow(new Date(r.createdAt)).date)}</AppText>
            {!!r.text && <AppText style={styles.reviewText}>{r.text}</AppText>}
            {r.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                {r.photos.map((p) => (
                  <Image key={p.id} source={{ uri: p.url }} style={styles.photo} />
                ))}
              </ScrollView>
            )}
            {r.helpfulCount > 0 && (
              <View style={styles.helpful}>
                <ThumbsUp size={13} color={colors.mutedIcon} />
                <AppText style={styles.date}>{t('critics.helpfulCount', { n: r.helpfulCount })}</AppText>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  muted: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  hero: { alignItems: 'center', gap: 10, backgroundColor: colors.peach, borderRadius: 24, padding: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 34, color: colors.orangeDark },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { borderRadius: 999, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  starBadge: { backgroundColor: colors.navy },
  badgeText: { fontSize: 12.5, color: colors.orangeDark },
  badgeTextLight: { fontSize: 12.5, color: colors.white },
  stats: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-around', marginTop: 4 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 19 },
  statLabel: { fontSize: 11.5, color: colors.muted },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.orange,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  following: { backgroundColor: colors.orange },
  followText: { fontSize: 14.5, color: colors.orangeDark },
  sectionTitle: { fontSize: 18, marginTop: 8 },
  review: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  restaurant: { fontSize: 15.5, flexShrink: 1 },
  stars: { color: colors.orange, fontSize: 15, letterSpacing: 1 },
  date: { fontSize: 12.5, color: colors.mutedIcon },
  reviewText: { fontSize: 14, lineHeight: 21 },
  photos: { gap: 6 },
  photo: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.surface },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
