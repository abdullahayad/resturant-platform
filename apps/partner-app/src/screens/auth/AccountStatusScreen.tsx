import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { AuthenticatedRestaurant } from '../../lib/api';

interface AccountStatusScreenProps {
  restaurant: AuthenticatedRestaurant;
  onSignOut: () => void;
}

const copyKeys: Record<string, { title: string; body: string }> = {
  PENDING_REVIEW: { title: 'accountStatus.pendingTitle', body: 'accountStatus.pendingBody' },
  REJECTED: { title: 'accountStatus.rejectedTitle', body: 'accountStatus.rejectedBody' },
  SUSPENDED: { title: 'accountStatus.suspendedTitle', body: 'accountStatus.suspendedBody' },
};

export function AccountStatusScreen({ restaurant, onSignOut }: AccountStatusScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const keys = copyKeys[restaurant.status] ?? copyKeys.PENDING_REVIEW;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t(keys.title)}</Text>
        <Text style={styles.name}>{restaurant.nameEn} · {restaurant.nameAr}</Text>
        <Text style={styles.body}>{t(keys.body)}</Text>
        {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>{t('accountStatus.reason')}</Text>
            <Text style={styles.reasonText}>{restaurant.rejectionReason}</Text>
          </View>
        )}
        <Pressable style={styles.button} onPress={onSignOut}>
          <Text style={styles.buttonText}>{t('common:signOut')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  name: { fontSize: 14, color: colors.foreground, textAlign: 'center' },
  body: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginTop: 4 },
  reasonBox: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  reasonLabel: { fontSize: 12, color: colors.mutedForeground },
  reasonText: { fontSize: 13, color: colors.foreground, marginTop: 4 },
  button: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.foreground, fontWeight: '600', fontSize: 14 },
});
