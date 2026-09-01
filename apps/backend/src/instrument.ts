// Must be imported before anything else in main.ts — Sentry needs to patch
// Node's internals (http, etc.) before other modules grab references to
// them, and errors thrown during startup itself won't be reported otherwise.
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

// Sentry.init silently no-ops when dsn is undefined, so this is safe to run
// with no SENTRY_DSN set (local dev doesn't need one).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
