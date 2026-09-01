import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

import App from './App';

// process.env.EXPO_PUBLIC_* vars are inlined into the JS bundle at build
// time (unlike the backend's plain process.env, there's no server to read a
// .env file from at runtime). Sentry.init() silently no-ops if dsn is
// undefined, so this is safe to ship even before EXPO_PUBLIC_SENTRY_DSN is
// set — mirrors apps/backend/src/instrument.ts's SENTRY_DSN handling.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Sentry.wrap(App));
