import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from './src/theme/colors';
import { AuthLandingScreen } from './src/screens/auth/AuthLandingScreen';
import { AppShell } from './src/navigation/AppShell';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      {isAuthenticated ? (
        <AppShell />
      ) : (
        <AuthLandingScreen
          onSignIn={() => setIsAuthenticated(true)}
          onRegister={() => setIsAuthenticated(true)}
        />
      )}
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
