import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

// Title with a back button, for screens opened on top of the tabs.
export function ScreenHeader({ title }: { title: string }) {
  const { t } = useTranslation();
  const Back = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  return (
    <View style={styles.header}>
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('restaurant.back')}>
        <Back size={24} color={colors.text} />
      </Pressable>
      <AppText weight="bold" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, flex: 1 },
});
