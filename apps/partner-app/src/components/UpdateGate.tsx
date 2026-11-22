import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type AppUpdateRule } from '../lib/api';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { radii } from '../theme/tokens';

// "1.10.0" > "1.9.2": compares number by number.
export function isOlder(current: string, minimum: string): boolean {
  const a = current.split('.').map((n) => parseInt(n, 10) || 0);
  const b = minimum.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

// The "new version" screen: when this app is older than the minimum set in
// the admin portal (App > App updates), it covers everything - sign-in
// included. "force" has no way past (even Android's back button does
// nothing); "soft" adds a "Later" link. Checked on open and on return.
export function UpdateGate() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [rule, setRule] = useState<AppUpdateRule | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(() => {
    api
      .appUpdateRule()
      .then(setRule)
      .catch(() => {}); // offline: never lock anyone out
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const version = Constants.expoConfig?.version ?? '0.0.0';
  const storeUrl = Platform.OS === 'ios' ? rule?.iosUrl : rule?.androidUrl;
  const outdated = !!rule?.minVersion && !!storeUrl && isOlder(version, rule.minVersion);
  const soft = rule?.mode === 'soft';
  if (!outdated || (soft && dismissed)) return null;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => soft && setDismissed(true)}>
      <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.middle}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>{t('update.title')}</Text>
          <Text style={styles.text}>{t(soft ? 'update.textSoft' : 'update.text')}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => Linking.openURL(storeUrl!)} accessibilityRole="button">
          <Text style={styles.buttonText}>{t('update.button')}</Text>
        </Pressable>
        {soft && (
          <Pressable onPress={() => setDismissed(true)} hitSlop={10} accessibilityRole="button">
            <Text style={styles.later}>{t('update.later')}</Text>
          </Pressable>
        )}
        <Text style={styles.version}>{t('update.version', { version })}</Text>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 28, alignItems: 'center', gap: 16 },
    middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    logo: { width: 112, height: 112, borderRadius: 28, marginBottom: 8 },
    title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: colors.foreground },
    text: { fontSize: 15.5, textAlign: 'center', color: colors.mutedForeground, lineHeight: 24 },
    button: {
      alignSelf: 'stretch',
      height: 56,
      borderRadius: radii.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { fontSize: 17, fontWeight: '700', color: colors.primaryForeground },
    later: { fontSize: 15, fontWeight: '600', color: colors.primary, paddingVertical: 4 },
    version: { fontSize: 12, color: colors.mutedForeground },
  });
