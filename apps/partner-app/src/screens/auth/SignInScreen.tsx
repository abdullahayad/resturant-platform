import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { FormField } from '../../components/FormField';
import { api, type AuthenticatedRestaurant, type StaffSession } from '../../lib/api';

interface SignInScreenProps {
  onBack: () => void;
  onSignedIn: (token: string, restaurant: AuthenticatedRestaurant, staff?: StaffSession) => void;
}

export function SignInScreen({ onBack, onSignedIn }: SignInScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (overrideEmail?: string, overridePassword?: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.login(overrideEmail ?? email, overridePassword ?? password);
      onSignedIn(result.accessToken, result.restaurant, result.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.title}>Sign In</Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="owner@restaurant.iq"
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, styles.primaryButton]} onPress={() => submit()} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </Pressable>

        {__DEV__ && (
          <Pressable
            style={styles.devLink}
            onPress={() => {
              setEmail('demo@restaurant.iq');
              setPassword('DemoPass123');
              submit('demo@restaurant.iq', 'DemoPass123');
            }}
          >
            <Text style={styles.devLinkText}>Quick demo login (dev only)</Text>
          </Pressable>
        )}
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
  },
  back: { color: colors.mutedForeground, fontSize: 14, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  primaryButtonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  error: { color: colors.destructive, fontSize: 13 },
  devLink: { marginTop: 8, alignItems: 'center' },
  devLinkText: { color: colors.mutedForeground, fontSize: 12, textDecorationLine: 'underline' },
});
