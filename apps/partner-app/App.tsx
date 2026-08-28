import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { ThemeColors } from './src/theme/colors';
import './src/i18n';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { getStoredSession, setStoredSession, type StoredSession } from './src/lib/session/storage';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { RegisterRestaurantScreen } from './src/screens/auth/RegisterRestaurantScreen';
import { SignInScreen } from './src/screens/auth/SignInScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { AccountStatusScreen } from './src/screens/auth/AccountStatusScreen';
import { AppShell } from './src/navigation/AppShell';
import { AuthContext } from './src/lib/AuthContext';
import { IntroOverlay } from './src/components/IntroOverlay';

type AuthView = 'landing' | 'register' | 'signIn' | 'forgotPassword';
type Session = StoredSession;

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [view, setView] = useState<AuthView>('landing');
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);

  useEffect(() => {
    getStoredSession().then((stored) => {
      if (stored) setSession(stored);
      setBootstrapped(true);
    });
  }, []);

  useEffect(() => {
    if (!bootstrapped) return; // don't clobber storage with null before rehydration finishes
    setStoredSession(session);
  }, [session, bootstrapped]);

  const signOut = () => {
    setSession(null);
    setView('landing');
  };

  return (
    <SafeAreaView style={styles.root}>
      {!bootstrapped ? (
        <View style={[styles.root, styles.centered]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : session ? (
        session.restaurant.status === 'APPROVED' ? (
          <AuthContext.Provider
            value={{
              token: session.token,
              restaurant: session.restaurant,
              staff: session.staff,
              setRestaurant: (restaurant) => setSession({ ...session, restaurant }),
              setToken: (token) => setSession({ ...session, token }),
              signOut,
            }}
          >
            <AppShell restaurant={session.restaurant} onSignOut={signOut} />
          </AuthContext.Provider>
        ) : (
          <AccountStatusScreen restaurant={session.restaurant} onSignOut={signOut} />
        )
      ) : (
        <>
          {view === 'landing' && (
            <AuthLandingScreen onSignIn={() => setView('signIn')} onRegister={() => setView('register')} />
          )}
          {view === 'signIn' && (
            <SignInScreen
              onBack={() => setView('landing')}
              onSignedIn={(token, restaurant, staff) => setSession({ token, restaurant, staff })}
              onForgotPassword={() => setView('forgotPassword')}
            />
          )}
          {view === 'forgotPassword' && (
            <ForgotPasswordScreen onBack={() => setView('signIn')} onDone={() => setView('signIn')} />
          )}
          {view === 'register' && (
            <RegisterRestaurantScreen onBack={() => setView('landing')} onRegistered={() => setView('landing')} />
          )}
        </>
      )}
      {introVisible && <IntroOverlay onDone={() => setIntroVisible(false)} />}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
  });
