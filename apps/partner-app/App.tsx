import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from './src/theme/colors';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { RegisterRestaurantScreen } from './src/screens/auth/RegisterRestaurantScreen';
import { AppShell } from './src/navigation/AppShell';

type AuthView = 'landing' | 'register' | 'app';

export default function App() {
  const [view, setView] = useState<AuthView>('landing');

  return (
    <SafeAreaView style={styles.root}>
      {view === 'app' && <AppShell />}
      {view === 'landing' && (
        <AuthLandingScreen
          onSignIn={() => setView('app')}
          onRegister={() => setView('register')}
        />
      )}
      {view === 'register' && (
        <RegisterRestaurantScreen
          onBack={() => setView('landing')}
          onRegistered={() => setView('landing')}
        />
      )}
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
