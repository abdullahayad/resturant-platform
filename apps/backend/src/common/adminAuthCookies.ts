import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'node:crypto';

// The admin portal used to hold the admin's JWT in localStorage, readable by
// any JS running on the page - a real risk if the portal ever grows an XSS
// bug (see security review). These two cookies replace that: the real
// token lives in an httpOnly cookie the browser sends automatically but no
// page script can ever read, and a second, deliberately *not* httpOnly
// cookie carries a random value the frontend echoes back as a header on
// every mutating request (see AdminAuthGuard) - a forged cross-site request
// would carry the httpOnly cookie automatically too, but couldn't read this
// one to produce a matching header, since cross-site JS can't read another
// site's cookies at all.
export const ADMIN_TOKEN_COOKIE = 'admin_token';
export const ADMIN_CSRF_COOKIE = 'admin_csrf';
export const ADMIN_CSRF_HEADER = 'x-csrf-token';

// Matches AuthModule's default JWT_EXPIRES_IN ('7d') - if that env var is
// ever changed, this can drift from it without breaking anything (a JWT
// that outlives its cookie just means signing out a little early; a cookie
// that outlives its JWT just means the browser holds an already-invalid
// token a little longer, which the backend rejects the same as any other
// expired token).
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// sameSite: 'none' is required at all - the admin portal and this API are
// different sites (different domains), not just different ports, so a
// cookie scoped any more tightly than this would never be sent at all. This
// is exactly why the CSRF cookie/header pair above is necessary, not
// optional, for this specific setup to be safe.
const sharedCookieOptions: CookieOptions = {
  secure: true,
  sameSite: 'none',
  maxAge: COOKIE_MAX_AGE_MS,
  path: '/',
};

export function setAdminAuthCookies(res: Response, accessToken: string): void {
  const csrfToken = randomBytes(24).toString('base64url');
  res.cookie(ADMIN_TOKEN_COOKIE, accessToken, { ...sharedCookieOptions, httpOnly: true });
  res.cookie(ADMIN_CSRF_COOKIE, csrfToken, { ...sharedCookieOptions, httpOnly: false });
}

export function clearAdminAuthCookies(res: Response): void {
  res.clearCookie(ADMIN_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(ADMIN_CSRF_COOKIE, { path: '/' });
}
