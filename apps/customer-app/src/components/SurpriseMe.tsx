import { router } from 'expo-router';
import { Dices, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type RestaurantCard as Card } from '../lib/api';
import { useArea } from '../lib/area';
import { colors } from '../theme';
import { AppText } from './AppText';
import { RestaurantCard } from './RestaurantCard';

type Shown = { status: 'loading' } | { status: 'found'; restaurant: Card } | { status: 'none' } | { status: 'failed' };

// "Can't decide? Surprise me" on Home: one random restaurant in the chosen
// area, open right now when possible. "Another one" never repeats a place
// from the same round.
export function SurpriseMe() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { area } = useArea();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<Shown>({ status: 'loading' });
  const [seen, setSeen] = useState<string[]>([]);

  const roll = async (exclude: string[]) => {
    setShown({ status: 'loading' });
    try {
      const restaurant = await api.surprise({
        provinceId: area?.provinceId,
        districtId: area?.districtId,
        exclude: exclude.slice(-30),
      });
      if (restaurant) {
        setSeen([...exclude, restaurant.id]);
        setShown({ status: 'found', restaurant });
      } else {
        setShown({ status: 'none' });
      }
    } catch {
      setShown({ status: 'failed' });
    }
  };

  const start = () => {
    setOpen(true);
    setSeen([]);
    void roll([]);
  };

  return (
    <>
      <Pressable style={styles.tile} onPress={start} accessibilityRole="button">
        <View style={styles.dice}>
          <Dices size={24} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <AppText weight="bold" style={styles.tileTitle}>
            {t('surprise.title')}
          </AppText>
          <AppText style={styles.tileText}>{t('surprise.text')}</AppText>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('home.close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <AppText weight="bold" style={styles.sheetTitle}>
            {t('surprise.sheetTitle')}
          </AppText>

          <View style={styles.body}>
            {shown.status === 'loading' && <ActivityIndicator color={colors.orange} size="large" />}
            {shown.status === 'found' && (
              <RestaurantCard
                restaurant={shown.restaurant}
                onPress={() => {
                  setOpen(false);
                  router.push({ pathname: '/restaurant/[id]', params: { id: shown.restaurant.id } });
                }}
              />
            )}
            {(shown.status === 'none' || shown.status === 'failed') && (
              <AppText style={styles.message}>{t(shown.status === 'none' ? 'surprise.none' : 'surprise.failed')}</AppText>
            )}
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.secondary]}
              onPress={() => void roll(shown.status === 'none' ? [] : seen)}
              disabled={shown.status === 'loading'}
              accessibilityRole="button"
            >
              <RefreshCw size={17} color={colors.navy} />
              <AppText weight="bold" style={styles.secondaryText}>
                {t(shown.status === 'none' ? 'surprise.startOver' : 'surprise.another')}
              </AppText>
            </Pressable>
            {shown.status === 'found' && (
              <Pressable
                style={[styles.button, styles.primary]}
                onPress={() => {
                  setOpen(false);
                  router.push({ pathname: '/restaurant/[id]', params: { id: shown.restaurant.id } });
                }}
                accessibilityRole="button"
              >
                <AppText weight="bold" style={styles.primaryText}>
                  {t('surprise.go')}
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.navy,
  },
  dice: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  tileTitle: { fontSize: 16, color: colors.white },
  tileText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,22,64,0.45)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, gap: 14 },
  sheetTitle: { fontSize: 20, marginHorizontal: 16 },
  body: { minHeight: 200, justifyContent: 'center', paddingHorizontal: 16 },
  message: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  button: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: colors.surface },
  secondaryText: { fontSize: 15, color: colors.navy },
  primary: { backgroundColor: colors.orange },
  primaryText: { fontSize: 15, color: colors.white },
});
