import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { AppText } from './AppText';

// Holds a tab's place until its real screen is built, so the bottom bar
// can already be navigated end to end.
export function ComingSoon({ section }: { section: 'profile' }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppText weight="bold" style={styles.title}>
        {t(`tabs.${section}`)}
      </AppText>
      <View style={styles.card}>
        <AppText weight="semibold" style={styles.soon}>
          {t('comingSoon.title')}
        </AppText>
        <AppText style={styles.text}>{t(`comingSoon.${section}`)}</AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  title: { fontSize: 26, marginTop: 12, marginBottom: 16 },
  card: { borderRadius: 18, backgroundColor: colors.surface, padding: 24, alignItems: 'center', gap: 6 },
  soon: { fontSize: 18, color: colors.orange },
  text: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
