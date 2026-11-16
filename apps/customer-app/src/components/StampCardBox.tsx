import { Gift, Stamp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { StampCardOffer, StampProgress } from '../lib/api';
import { colors } from '../theme';
import { AppText } from './AppText';

// A restaurant's stamp card: "Every 5 visits = free dessert", with the
// customer's stamps filled in when signed in. Stamps come from staff
// scanning the visit code, one per day.
export function StampCardBox({
  offer,
  progress,
  title,
}: {
  offer: StampCardOffer;
  progress?: StampProgress | null;
  // Shown instead of the generic heading (the restaurant name in Profile).
  title?: string;
}) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const reward = ar ? offer.rewardAr : offer.rewardEn;
  const stamps = progress?.stamps ?? 0;
  const ready = !!progress?.ready;

  return (
    <View style={[styles.box, ready && styles.boxReady]}>
      <View style={styles.top}>
        {ready ? <Gift size={20} color={colors.green} /> : <Stamp size={20} color={colors.orangeDark} />}
        <View style={styles.flex}>
          <AppText weight="bold" style={styles.title} numberOfLines={1}>
            {title ?? t('stamps.title')}
          </AppText>
          <AppText style={styles.text}>{t('stamps.offer', { count: offer.visitsRequired, reward })}</AppText>
        </View>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: offer.visitsRequired }, (_, i) => (
          <View key={i} style={[styles.dot, i < stamps && styles.dotFilled]} />
        ))}
      </View>
      <AppText weight={ready ? 'bold' : 'regular'} style={[styles.status, ready && { color: colors.green }]}>
        {progress === undefined
          ? t('stamps.signInHint')
          : ready
            ? t('stamps.ready', { reward })
            : t('stamps.progress', { stamps, total: offer.visitsRequired })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#F0C9A8', backgroundColor: colors.peach, padding: 14, gap: 10 },
  boxReady: { borderColor: colors.green, backgroundColor: colors.greenTint },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  title: { fontSize: 15 },
  text: { fontSize: 13, color: colors.muted },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.orange, backgroundColor: colors.white },
  dotFilled: { backgroundColor: colors.orange },
  status: { fontSize: 13, color: colors.text },
});
