import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { ThemeColors } from './src/theme/colors';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { RegisterRestaurantScreen } from './src/screens/auth/RegisterRestaurantScreen';
import { SignInScreen } from './src/screens/auth/SignInScreen';
import { AccountStatusScreen } from './src/screens/auth/AccountStatusScreen';
import { AppShell } from './src/navigation/AppShell';
import { AuthContext } from './src/lib/AuthContext';
import type { AuthenticatedRestaurant, StaffSession } from './src/lib/api';

type View = 'landing' | 'register' | 'signIn';

interface Session {
  token: string;
  restaurant: AuthenticatedRestaurant;
  staff?: StaffSession;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [view, setView] = useState<View>('landing');
  const [session, setSession] = useState<Session | null>(null);

  const signOut = () => {
    setSession(null);
    setView('landing');
  };

  return (
    <SafeAreaView style={styles.root}>
      {session ? (
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
            />
          )}
          {view === 'register' && (
            <RegisterRestaurantScreen onBack={() => setView('landing')} onRegistered={() => setView('landing')} />
          )}
        </>
      )}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
  });
