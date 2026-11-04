import { router, useFocusEffect } from 'expo-router';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Pencil,
  QrCode,
  Trash2,
  User,
} from 'lucide-react-native';
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
import { api, type MyVisit, type NamedRef } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { chooseLanguage, type Language } from '../../src/i18n';
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
  const [followed, setFollowed] = useState<Awaited<ReturnType<typeof api.followedRestaurants>>>([]);
  const [cuisines, setCuisines] = useState<NamedRef[]>([]);
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
      api
        .followedRestaurants()
        .then((f) => {
          if (!cancelled) setFollowed(f);
        })
        .catch(() => {});
      api
        .foodCategories()
        .then((c) => {
          if (!cancelled) setCuisines(c);
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
          <LanguageSwitch />
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

        {customer.isPublic && (
          <View style={[styles.card, styles.criticCard]}>
            <AppText weight="bold" style={styles.settingTitle}>
              {customer.isCritic ? t('critics.youAre', { n: customer.followerCount }) : t('critics.notYet', { n: customer.criticMinVisits })}
            </AppText>
            {customer.isCritic && (
              <Pressable onPress={() => router.push({ pathname: '/critic/[id]', params: { id: customer.id } })} hitSlop={6}>
                <AppText weight="semibold" style={styles.link}>
                  {t('critics.seePage')}
                </AppText>
              </Pressable>
            )}
            <AppText style={styles.settingText}>{t('critics.specialtiesHint')}</AppText>
            <View style={styles.specialties}>
              {cuisines.map((c) => {
                const on = customer.specialtyIds.includes(c.id);
                const full = !on && customer.specialtyIds.length >= 3;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.specialty, on && styles.specialtyOn, full && styles.specialtyFull]}
                    disabled={full}
                    onPress={() =>
                      update({
                        specialtyIds: on
                          ? customer.specialtyIds.filter((x) => x !== c.id)
                          : [...customer.specialtyIds, c.id],
                      }).catch(() => {})
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: full }}
                  >
                    <AppText weight="semibold" style={[styles.specialtyText, on && styles.specialtyTextOn]}>
                      {ar ? c.nameAr : c.nameEn}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {followed.length > 0 && (
          <>
            <AppText weight="bold" style={styles.sectionTitle}>
              {t('profile.following', { n: followed.length })}
            </AppText>
            <View style={styles.card}>
              {followed.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.visitRow}
                  onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}
                  accessibilityRole="link"
                >
                  {r.logoUrl ? (
                    <Image source={{ uri: r.logoUrl }} style={styles.visitLogo} />
                  ) : (
                    <View style={[styles.visitLogo, styles.visitLogoEmpty]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <AppText weight="semibold">{ar ? r.nameAr : r.nameEn}</AppText>
                    {r.district && (
                      <AppText style={styles.settingText}>{ar ? r.district.nameAr : r.district.nameEn}</AppText>
                    )}
                  </View>
                  <Chevron size={18} color={colors.mutedIcon} />
                </Pressable>
              ))}
            </View>
          </>
        )}

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

        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => router.push('/bookings')} accessibilityRole="link">
            <CalendarCheck size={20} color={colors.text} />
            <AppText weight="semibold" style={[styles.settingTitle, { flex: 1 }]}>
              {t('profile.myBookings')}
            </AppText>
            <Chevron size={18} color={colors.mutedIcon} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => router.push('/my-reviews')} accessibilityRole="link">
            <MessageSquareText size={20} color={colors.text} />
            <AppText weight="semibold" style={[styles.settingTitle, { flex: 1 }]}>
              {t('profile.myReviews')}
            </AppText>
            <Chevron size={18} color={colors.mutedIcon} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => router.push('/help')} accessibilityRole="link">
            <LifeBuoy size={20} color={colors.text} />
            <AppText weight="semibold" style={[styles.settingTitle, { flex: 1 }]}>
              {t('profile.help')}
            </AppText>
            <Chevron size={18} color={colors.mutedIcon} />
          </Pressable>
        </View>

        <LanguageSwitch />

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

// العربية / English - works signed in or not. Switching between Arabic
// (right-to-left) and English restarts the app into the new layout.
function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = i18n.language as Language;
  const options: { lang: Language; label: string }[] = [
    { lang: 'ar', label: 'العربية' },
    { lang: 'en', label: 'English' },
  ];
  return (
    <View style={[styles.card, styles.languageCard]}>
      <AppText weight="semibold" style={styles.settingTitle}>
        {t('profile.language')}
      </AppText>
      <View style={styles.languageOptions}>
        {options.map((o) => (
          <Pressable
            key={o.lang}
            style={[styles.languageOption, current === o.lang && styles.languageOptionActive]}
            onPress={() => current !== o.lang && chooseLanguage(o.lang)}
            accessibilityRole="radio"
            accessibilityState={{ checked: current === o.lang }}
          >
            <AppText weight="bold" style={[styles.languageText, current === o.lang && styles.languageTextActive]}>
              {o.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  languageCard: { padding: 14, gap: 10 },
  criticCard: { padding: 14, gap: 8 },
  link: { fontSize: 13.5, color: colors.blue },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialty: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  specialtyOn: { backgroundColor: colors.blueTint, borderColor: colors.blue },
  specialtyFull: { opacity: 0.4 },
  specialtyText: { fontSize: 13 },
  specialtyTextOn: { color: colors.blue },
  languageOptions: { flexDirection: 'row', gap: 8 },
  languageOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptionActive: { borderColor: colors.orange, backgroundColor: colors.peach },
  languageText: { fontSize: 15, color: colors.muted },
  languageTextActive: { color: colors.orangeDark },
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
