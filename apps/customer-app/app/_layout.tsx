import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { loadSavedLanguage } from '../src/i18n';
import { AreaProvider } from '../src/lib/area';
import { AuthProvider } from '../src/lib/auth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  // The language picked in Profile, applied before anything shows.
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    loadSavedLanguage().finally(() => setLanguageReady(true));
  }, []);

  const ready = (loaded || !!error) && languageReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // If the font fails to load, carry on with the system font rather than
  // leaving the customer on a blank screen.
  if (!ready) return null;

  return (
    <AuthProvider>
      <AreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="restaurant/[id]" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="my-reviews" />
      </Stack>
      </AreaProvider>
    </AuthProvider>
  );
}
