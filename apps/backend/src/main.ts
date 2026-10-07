// Must run before any other import: initializes Sentry (needs to patch
// Node's internals before other modules grab references to them) and loads
// .env as its own first line — which AuthModule's JwtModule.register() also
// depends on, since it reads process.env.JWT_SECRET as a static decorator
// argument evaluated at import time, before @nestjs/config's
// ConfigModule.forRoot() would otherwise get a chance to load .env.
// Confirmed by a hard failure in requireJwtSecret() during the security
// review; see jwt-secret.ts and instrument.ts.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Routes that stay at a permanent, unversioned address — either because
// they're given out externally (the Privacy Policy link goes in the Play
// Store listing itself; changing it later would mean re-submitting store
// metadata; "review" is printed on a physical QR code at each restaurant's
// tables, which is even less changeable than a store listing), or because
// something outside our own apps depends on the exact path (UptimeRobot
// pings "/", Swagger serves its own sub-paths under "/docs"). Everything
// else moves under /v1.
const UNVERSIONED_ROUTES = [
  'privacy-policy',
  'terms-of-service',
  'docs',
  'docs-json',
  'support-session',
  'review',
  'restaurant',
];

// Helmet's default CSP img-src is 'self' data: only - every uploaded photo
// (reviews, gallery, logos) lives on a different host (STORAGE_PUBLIC_URL),
// so without this those <img> tags are silently blocked by the browser on
// every public HTML page (review page, public restaurant page). Computed
// once at startup rather than per-request since the storage host never
// changes at runtime.
const storageOrigin = new URL(process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000')
  .origin;

// Comma-separated list of allowed browser origins, e.g.
// "http://localhost:5173,https://admin.example.com". Falls back to the
// known local dev origins (admin portal + Expo web) rather than reflecting
// any origin (see security review) — set ALLOWED_ORIGINS explicitly in
// any deployed environment.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:8082')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Docs describe route shapes only (no secrets), but stay opt-in everywhere —
// fails closed if NODE_ENV is ever left unset in a deployed environment
// (see security review) rather than fail open by default outside production.
const swaggerEnabled = process.env.ENABLE_SWAGGER === 'true';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CSP is applied separately below, conditionally, instead of here - a
  // second helmet() call scoped to /docs used to try to "relax" CSP just
  // for Swagger, but helmet only ever adds a header, it never removes one
  // an earlier middleware already set, so this app-wide call setting CSP
  // unconditionally meant the /docs override never actually took effect
  // (see security review).
  app.use(helmet({ contentSecurityPolicy: false }));
  // Needed to read the admin portal's httpOnly auth cookie off incoming
  // requests (see adminAuthCookies.ts / jwt.strategy.ts) - Express doesn't
  // parse cookies into req.cookies on its own.
  app.use(cookieParser());

  // Every route now canonically lives under /v1 (see setGlobalPrefix below),
  // but the app already installed on real phones was built calling the old
  // unprefixed paths (e.g. /restaurants, not /v1/restaurants) — this
  // silently rewrites those old-style requests to hit the same /v1 handlers,
  // so both styles work at once. Once every installed app has updated to
  // call /v1 directly, this rewrite (and the old-style calls it supports)
  // can be dropped.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const path = req.url.split('?')[0];
    const isRoot = path === '/';
    const isUnversioned =
      isRoot || UNVERSIONED_ROUTES.some((route) => path === `/${route}` || path.startsWith(`/${route}/`));
    if (!isUnversioned && !path.startsWith('/v1/') && path !== '/v1') {
      req.url = `/v1${req.url}`;
    }
    next();
  });
  // A plain string here only excludes that EXACT path, not any sub-path -
  // fine for every unversioned route above except "review", whose actual
  // route has a param segment (review/:restaurantId). Nest's own router
  // (separate from the rewrite middleware above, which does prefix-match
  // correctly) needs that child path spelled out explicitly, or it still
  // registers the controller under /v1 and this global prefix's bare
  // 'review' string never matches the real request path at all.
  app.setGlobalPrefix('v1', {
    exclude: [
      '/',
      ...UNVERSIONED_ROUTES,
      { path: 'review/:restaurantId', method: RequestMethod.GET },
      { path: 'restaurant/:id', method: RequestMethod.GET },
    ],
  });

  // A fresh random value per request, exposed to route handlers via
  // res.locals so the review page (the only route with an inline <script>)
  // can stamp it onto that tag - see the scriptSrc directive below, which
  // only allows a <script> through if its nonce matches this same value.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = randomBytes(16).toString('base64');
    next();
  });

  // CSP applies to every route except /docs - Swagger UI's bootstrap script
  // is inline, which a real CSP blocks, so /docs runs with none instead
  // (still gets every other helmet header, from the app-wide call above).
  // scriptSrc extends helmet's own defaults with the per-request nonce
  // above rather than 'unsafe-inline' - an injected <script> from a stored
  // XSS wouldn't know this request's nonce, so it still gets blocked; only
  // the one inline script this response itself rendered does.
  const cspMiddleware = helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Must be the same kebab-case key getDefaultDirectives() itself uses
      // ('script-src', not 'scriptSrc') - helmet treats those as two
      // different directives rather than one overriding the other, which
      // throws "duplicate directive" the moment both are present at once.
      'script-src': ["'self'", (_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`],
      'img-src': ["'self'", 'data:', storageOrigin],
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.url.split('?')[0];
    if (swaggerEnabled && (path === '/docs' || path.startsWith('/docs/'))) return next();
    return cspMiddleware(req, res, next);
  });

  // maxAge lets the browser cache a preflight's "yes, this is allowed"
  // answer instead of re-asking with a separate OPTIONS round-trip before
  // every single authenticated request - each browser clamps this to its
  // own ceiling regardless (Chromium: 2h, Firefox: 24h), so 7200s is
  // honored as-is everywhere rather than silently getting cut down further
  // in one of them. Web-only: native app requests aren't subject to CORS
  // preflights at all, so this has no effect there.
  // credentials: true lets the browser actually send/receive the admin
  // portal's auth cookie cross-site (the portal and this API are different
  // domains) - without it, the browser silently drops the cookie on both
  // the request and the Set-Cookie response, regardless of what the cookie
  // itself specifies.
  app.enableCors({ origin: allowedOrigins, credentials: true, maxAge: 7200 });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Restaurant Platform API')
      .setDescription('Backend API for the LiGETA partner app and admin portal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
