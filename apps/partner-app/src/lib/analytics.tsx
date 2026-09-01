import type { ReactNode } from 'react';
import { PostHogProvider, usePostHog } from 'posthog-react-native';

// EXPO_PUBLIC_* vars are inlined into the JS bundle at build time. Same
// "safe if absent" pattern as Sentry (see index.ts) — until
// EXPO_PUBLIC_POSTHOG_API_KEY is set, this renders children directly with
// no analytics wired up, rather than crashing on a missing key.
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!apiKey) return <>{children}</>;
  return (
    <PostHogProvider apiKey={apiKey} options={{ host: 'https://eu.i.posthog.com' }} autocapture>
      {children}
    </PostHogProvider>
  );
}

// Wraps usePostHog() so call sites don't need their own "what if analytics
// isn't configured" branch — usePostHog() returns undefined outside a
// PostHogProvider, and capture() on undefined would throw.
type EventProperties = Record<string, string | number | boolean | null>;

export function useAnalytics() {
  const posthog = usePostHog();
  return {
    track: (event: string, properties?: EventProperties) => posthog?.capture(event, properties),
    identify: (restaurantId: string, properties?: EventProperties) => posthog?.identify(restaurantId, properties),
  };
}
