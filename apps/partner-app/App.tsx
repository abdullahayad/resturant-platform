import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from './src/theme/colors';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { RegisterRestaurantScreen } from './src/screens/auth/RegisterRestaurantScreen';
import { SignInScreen } from './src/screens/auth/SignInScreen';
import { AccountStatusScreen } from './src/screens/auth/AccountStatusScreen';
import { AppShell } from './src/navigation/AppShell';
import type { AuthenticatedRestaurant } from './src/lib/api';

type View = 'landing' | 'register' | 'signIn';

interface Session {
  token: string;
  restaurant: AuthenticatedRestaurant;
}

export default function App() {
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
          <AppShell restaurant={session.restaurant} onSignOut={signOut} />
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
              onSignedIn={(token, restaurant) => setSession({ token, restaurant })}
            />
          )}
          {view === 'register' && (
            <RegisterRestaurantScreen onBack={() => setView('landing')} onRegistered={() => setView('landing')} />
          )}
        </>
      )}
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
