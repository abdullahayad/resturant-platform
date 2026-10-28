import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Eye, LogOut, Pencil, QrCode, Trash2, User } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { VisitCodeSheet } from '../../src/components/VisitCodeSheet';
import { api, type MyVisit } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { useDateLabels } from '../../src/lib/useDateLabels';
import { colors, fonts, TAB_BAR_SPACE } from '../../src/theme';

// The 5 levels' thresholds, same as the server's customer-levels.ts - only
// used to draw the progress bar; the level itself always comes from the server.
const LEVEL_STARTS = [0, 3, 10, 25, 50];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status, customer, refresh, update, signOut, deleteAccount } = useAuth();
  const { dateLabel } = useDateLabels();
  const [showCode, setShowCode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [visits, setVisits] = useState<MyVisit[]>([]);
  const ar = i18n.language === 'ar';
  const Chevron = I18nManager.isRTL ? ChevronLeft : ChevronRight;

  // Fresh level and visits every time the tab is opened (a restaurant may
  // have just scanned the code).
  useFocusEffect(
    useCallback(() => {
      if (status !== 'signedIn') return;
      let cancelled = false;
      refresh();
      api
        .myVisits()
        .then((v) => {
          if (!cancelled) setVisits(v.items.slice(0, 5));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [status, refresh]),
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.orange} />
      </SafeAreaView>
    );
  }

  if (status === 'signedOut' || !customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
          <AppText weight="bold" style={styles.title}>
            {t('tabs.profile')}
          </AppText>
          <View style={styles.signedOut}>
            <View style={styles.avatarBig}>
              <User size={40} color={colors.orange} />
            </View>
            <AppText weight="bold" style={styles.signedOutTitle}>
              {t('profile.signInTitle')}
            </AppText>
            <AppText style={styles.signedOutText}>{t('profile.signInText')}</AppText>
            <Pressable style={styles.primary} onPress={() => router.push('/login')} accessibilityRole="button">
              <AppText weight="bold" style={styles.primaryText}>
                {t('profile.signIn')}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { level, visitCount, nextLevelAt } = customer;
  const start = LEVEL_STARTS[level - 1] ?? 0;
  const progress = nextLevelAt ? Math.min(1, (visitCount - start) / (nextLevelAt - start)) : 1;

  const saveName = async () => {
    setEditing(false);
    if (nameDraft.trim() === (customer.name ?? '')) return;
    try {
      await update({ name: nameDraft.trim() });
    } catch {
      Alert.alert(t('explore.errorTitle'), t('explore.errorText'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteText'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteConfirm'),
        style: 'destructive',
        onPress: () => deleteAccount().catch(() => Alert.alert(t('explore.errorTitle'), t('explore.errorText'))),
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + TAB_BAR_SPACE }]}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.profile')}
        </AppText>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <AppText weight="bold" style={styles.avatarText}>
              {(customer.name ?? '؟').trim().charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {editing ? (
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                onBlur={saveName}
                onSubmitEditing={saveName}
                autoFocus
                maxLength={60}
                style={styles.nameInput}
                placeholder={t('profile.namePlaceholder')}
                placeholderTextColor={colors.mutedIcon}
              />
            ) : (
              <Pressable
                style={styles.nameRow}
                onPress={() => {
                  setNameDraft(customer.name ?? '');
                  setEditing(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('profile.editName')}
              >
                <AppText weight="bold" style={styles.name}>
                  {customer.name || t('profile.addName')}
                </AppText>
                <Pencil size={15} color={colors.mutedIcon} />
              </Pressable>
            )}
            <AppText style={styles.phone}>{customer.phone}</AppText>
          </View>
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <AppText weight="bold" style={styles.levelTitle}>
              {t('profile.level', { n: level })}
            </AppText>
            <AppText weight="semibold" style={styles.levelVisits}>
              {t('profile.visits', { n: visitCount })}
            </AppText>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <AppText style={styles.levelHint}>
            {nextLevelAt
              ? t('profile.toNext', { n: nextLevelAt - visitCount, level: level + 1 })
              : t('profile.topLevel')}
          </AppText>
          <Pressable style={styles.codeButton} onPress={() => setShowCode(true)} accessibilityRole="button">
            <QrCode size={20} color={colors.white} />
            <AppText weight="bold" style={styles.codeButtonText}>
              {t('profile.visitCode')}
            </AppText>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Eye size={20} color={colors.text} />
            <View style={{ flex: 1 }}>
              <AppText weight="semibold" style={styles.settingTitle}>
                {t('profile.public')}
              </AppText>
              <AppText style={styles.settingText}>{t('profile.publicText')}</AppText>
            </View>
            <Switch
              value={customer.isPublic}
              onValueChange={(v) => update({ isPublic: v }).catch(() => {})}
              trackColor={{ true: colors.orange, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {visits.length > 0 && (
          <>
            <AppText weight="bold" style={styles.sectionTitle}>
              {t('profile.recentVisits')}
            </AppText>
            <View style={styles.card}>
              {visits.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.visitRow}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: v.restaurant.id } })}
                  accessibilityRole="link"
                >
                  {v.restaurant.logoUrl ? (
                    <Image source={{ uri: v.restaurant.logoUrl }} style={styles.visitLogo} />
                  ) : (
                    <View style={[styles.visitLogo, styles.visitLogoEmpty]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{ar ? v.restaurant.nameAr : v.restaurant.nameEn}</AppText>
                    <AppText style={styles.settingText}>{dateLabel(v.visitDate)}</AppText>
                  </View>
                  <Chevron size={18} color={colors.mutedIcon} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={[styles.card, { marginTop: 18 }]}>
          <Pressable style={styles.settingRow} onPress={signOut} accessibilityRole="button">
            <LogOut size={20} color={colors.text} />
            <AppText weight="semibold" style={[styles.settingTitle, { flex: 1 }]}>
              {t('profile.signOut')}
            </AppText>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={confirmDelete} accessibilityRole="button">
            <Trash2 size={20} color={colors.red} />
            <AppText weight="semibold" style={[styles.settingTitle, { flex: 1, color: colors.red }]}>
              {t('profile.delete')}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      {showCode && <VisitCodeSheet level={level} onClose={() => setShowCode(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 26, marginBottom: 16 },
  signedOut: { alignItems: 'center', gap: 10, backgroundColor: colors.peach, borderRadius: 24, padding: 24 },
  avatarBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedOutTitle: { fontSize: 19, textAlign: 'center' },
  signedOutText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  primary: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryText: { color: colors.white, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, color: colors.orangeDark },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20 },
  nameInput: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.orange,
    paddingVertical: 2,
  },
  phone: { fontSize: 13.5, color: colors.muted },
  levelCard: { backgroundColor: colors.navy, borderRadius: 22, padding: 18, gap: 10 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelTitle: { color: colors.white, fontSize: 22 },
  levelVisits: { color: '#D8D2F0', fontSize: 13.5 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.orange },
  levelHint: { color: '#D8D2F0', fontSize: 13 },
  codeButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.orange,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  codeButtonText: { color: colors.white, fontSize: 15.5 },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginTop: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingTitle: { fontSize: 15 },
  settingText: { fontSize: 12.5, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },
  sectionTitle: { fontSize: 17, marginTop: 20 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  visitLogo: { width: 40, height: 40, borderRadius: 12 },
  visitLogoEmpty: { backgroundColor: colors.surface },
});
