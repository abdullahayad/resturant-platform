import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, StyleSheet, View, type AppStateStatus } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { ThemeColors } from './src/theme/colors';
import './src/i18n';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { getStoredSession, setStoredSession, type StoredSession } from './src/lib/session/storage';
import { api, setUnauthorizedHandler } from './src/lib/api';
import { FLAGGABLE_KEYS } from './src/lib/nav';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { RegisterRestaurantScreen } from './src/screens/auth/RegisterRestaurantScreen';
import { SignInScreen } from './src/screens/auth/SignInScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { AccountStatusScreen } from './src/screens/auth/AccountStatusScreen';
import { AppShell } from './src/navigation/AppShell';
import { AuthContext } from './src/lib/AuthContext';
import { IntroOverlay } from './src/components/IntroOverlay';
import { AnalyticsProvider, useAnalytics } from './src/lib/analytics';
import { ErrorBoundary } from './src/components/ErrorBoundary';

type AuthView = 'landing' | 'register' | 'signIn' | 'forgotPassword';
type Session = StoredSession;

// After sitting in the background this long, replaying the intro on return makes
// the app feel deliberately "reopened" rather than just resumed mid-thought —
// matching what most well-made apps do. A brief switch away (a notification, a
// phone call) shouldn't trigger it, only a genuine period of not using the app.
const INTRO_REPLAY_AFTER_MS = 60 * 60 * 1000;

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AnalyticsProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AppContent />
            </LanguageProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { track, identify } = useAnalytics();
  const [view, setView] = useState<AuthView>('landing');
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [enabledKeys, setEnabledKeys] = useState<string[] | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    getStoredSession().then((stored) => {
      if (stored) setSession(stored);
      setBootstrapped(true);
    });
  }, []);

  // Which sidebar sections this restaurant can see — fetched once per
  // sign-in so AppShell never flashes a section and then removes it a
  // moment later. Reset on sign-out so the next sign-in fetches fresh.
  useEffect(() => {
    if (!session || session.restaurant.status !== 'APPROVED') {
      setEnabledKeys(null);
      return;
    }
    let cancelled = false;
    api
      .myFeatureFlags(session.token)
      .then((keys) => { if (!cancelled) setEnabledKeys(keys); })
      // Fail open, not closed — a network hiccup here should never lock a
      // restaurant out of sections they'd normally see.
      .catch(() => { if (!cancelled) setEnabledKeys([...FLAGGABLE_KEYS]); });
    return () => {
      cancelled = true;
    };
  }, [session?.token, session?.restaurant.status]);

  // "Manage as this restaurant" - an admin-issued link (ligetapartner://support?token=...)
  // scanned as a QR from the admin portal. Applies once bootstrap has
  // settled so it always wins over whatever session was already stored.
  useEffect(() => {
    if (!bootstrapped) return;

    async function applySupportLink(url: string | null) {
      if (!url) return;
      const { hostname, queryParams } = Linking.parse(url);
      const token = queryParams?.token;
      if (hostname !== 'support' || typeof token !== 'string') return;
      try {
        const restaurant = await api.me(token);
        setSession({ token, restaurant });
      } catch {
        setSession(null);
        setSessionExpired(true);
        setView('signIn');
      }
    }

    Linking.getInitialURL().then(applySupportLink);
    const subscription = Linking.addEventListener('url', ({ url }) => applySupportLink(url));
    return () => subscription.remove();
  }, [bootstrapped]);

  // A stale login token makes every authenticated request fail with 401 — the
  // api layer reports that here instead of each screen showing a misleading
  // "Could not reach the server" message. Route straight to sign-in with a
  // clear explanation instead of leaving the user stuck on a broken screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setSessionExpired(true);
      setView('signIn');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (nextState === 'active' && backgroundedAtRef.current !== null) {
        if (Date.now() - backgroundedAtRef.current >= INTRO_REPLAY_AFTER_MS) {
          setIntroVisible(true);
        }
        backgroundedAtRef.current = null;
      }
    });
    return () => subscription.remove();
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
          enabledKeys === null ? (
            <View style={[styles.root, styles.centered]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <AuthContext.Provider
              value={{
                token: session.token,
                restaurant: session.restaurant,
                staff: session.staff,
                enabledKeys,
                setRestaurant: (restaurant) => setSession({ ...session, restaurant }),
                setToken: (token) => setSession({ ...session, token }),
                signOut,
              }}
            >
              <AppShell restaurant={session.restaurant} onSignOut={signOut} />
            </AuthContext.Provider>
          )
        ) : (
          <AccountStatusScreen restaurant={session.restaurant} onSignOut={signOut} />
        )
      ) : (
        <>
          {view === 'landing' && (
            <AuthLandingScreen
              onSignIn={() => {
                setSessionExpired(false);
                setView('signIn');
              }}
              onRegister={() => setView('register')}
            />
          )}
          {view === 'signIn' && (
            <SignInScreen
              sessionExpired={sessionExpired}
              onBack={() => {
                setSessionExpired(false);
                setView('landing');
              }}
              onSignedIn={(token, restaurant, staff) => {
                identify(restaurant.id, { name: restaurant.nameEn, status: restaurant.status });
                track('signed_in');
                setSession({ token, restaurant, staff });
              }}
              onForgotPassword={() => setView('forgotPassword')}
            />
          )}
          {view === 'forgotPassword' && (
            <ForgotPasswordScreen onBack={() => setView('signIn')} onDone={() => setView('signIn')} />
          )}
          {view === 'register' && (
            <RegisterRestaurantScreen
              onBack={() => setView('landing')}
              onRegistered={() => {
                track('restaurant_registered');
                setView('landing');
              }}
            />
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
