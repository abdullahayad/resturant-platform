// Must be imported before anything else in main.ts — Sentry needs to patch
// Node's internals (http, etc.) before other modules grab references to
// them, and errors thrown during startup itself won't be reported otherwise.
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

// Sentry.init silently no-ops when dsn is undefined, so this is safe to run
// with no SENTRY_DSN set (local dev doesn't need one).
// Without an explicit environment Sentry labels everything "production",
// which mixed local dev errors (port clashes, local MinIO down) in with real
// ones. Render sets RENDER=true on its own servers, so that's the signal.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? (process.env.RENDER ? 'production' : 'development'),
  tracesSampleRate: 1.0,
});
