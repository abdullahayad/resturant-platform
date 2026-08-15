import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

interface AuthLandingScreenProps {
  onSignIn: () => void;
  onRegister: () => void;
}

export function AuthLandingScreen({ onSignIn, onRegister }: AuthLandingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brand}>Restaurant Partner Portal</Text>
        <Text style={styles.subtitle}>Manage your restaurant's public profile, menu, and reviews.</Text>

        <Pressable style={[styles.button, styles.primaryButton]} onPress={onSignIn}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={onRegister}>
          <Text style={styles.secondaryButtonText}>Register Restaurant</Text>
        </Pressable>

        {__DEV__ && (
          <Pressable style={styles.devLink} onPress={onSignIn}>
            <Text style={styles.devLinkText}>Quick demo login (dev only)</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    gap: 12,
  },
  brand: { fontSize: 22, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: colors.primary },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.foreground, fontWeight: '600', fontSize: 15 },
  devLink: { marginTop: 8, alignItems: 'center' },
  devLinkText: { color: colors.mutedForeground, fontSize: 12, textDecorationLine: 'underline' },
});
