import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { AuthenticatedRestaurant } from '../../lib/api';

interface AccountStatusScreenProps {
  restaurant: AuthenticatedRestaurant;
  onSignOut: () => void;
}

const copy: Record<string, { title: string; body: string }> = {
  PENDING_REVIEW: {
    title: 'Pending Review',
    body: "Your restaurant is still being reviewed by our team. You'll be able to access your dashboard once it's approved.",
  },
  REJECTED: {
    title: 'Application Rejected',
    body: 'Your restaurant application was not approved.',
  },
  SUSPENDED: {
    title: 'Account Suspended',
    body: 'Your restaurant listing has been suspended. Contact support for details.',
  },
};

export function AccountStatusScreen({ restaurant, onSignOut }: AccountStatusScreenProps) {
  const info = copy[restaurant.status] ?? copy.PENDING_REVIEW;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{info.title}</Text>
        <Text style={styles.name}>{restaurant.nameEn} · {restaurant.nameAr}</Text>
        <Text style={styles.body}>{info.body}</Text>
        {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{restaurant.rejectionReason}</Text>
          </View>
        )}
        <Pressable style={styles.button} onPress={onSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
