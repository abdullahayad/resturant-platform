import type { CookieOptions, Response } from 'express';
import { createHmac } from 'node:crypto';
import { requireJwtSecret } from '../auth/jwt-secret';

// The admin portal used to hold the admin's JWT in localStorage, readable by
// any JS running on the page - a real risk if the portal ever grows an XSS
// bug (see security review). The real token now lives in an httpOnly cookie
// the browser sends automatically but no page script can ever read.
//
// CSRF protection does NOT use a second cookie, despite that being the
// textbook "double-submit cookie" pattern - it can't work here. The admin
// portal and this API are different sites (different domains), so a cookie
// this API sets is only ever visible to a page's own document.cookie if
// that page is served from THIS API's own origin. The admin portal never
// is, so a second cookie would silently never be readable by the frontend
// at all (this was tried and shipped once, and broke every mutating
// request in the deployed portal - see the fix commit for the postmortem).
//
// Instead, the CSRF token is a value the server can recompute and verify
// without storing or cookie-ing anything: an HMAC of the admin's id keyed
// on the JWT secret. Login/me responses hand it to the frontend in the
// JSON body (readable cross-origin because it's the frontend's own fetch
// response, not a cookie), the frontend echoes it back as a header on
// every mutating request, and the guard just recomputes the same HMAC from
// the already-authenticated JWT's subject and compares. A forged cross-site
// request would carry the httpOnly auth cookie automatically, but the
// attacking page can never read this token to produce a matching header -
// it was only ever returned in a response the attacker's origin can't see.
export const ADMIN_TOKEN_COOKIE = 'admin_token';
export const ADMIN_CSRF_COOKIE = 'admin_csrf';
export const ADMIN_CSRF_HEADER = 'x-csrf-token';

export function computeAdminCsrfToken(adminId: string): string {
  return createHmac('sha256', requireJwtSecret()).update(adminId).digest('base64url');
}

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
  res.cookie(ADMIN_TOKEN_COOKIE, accessToken, { ...sharedCookieOptions, httpOnly: true });
}

export function clearAdminAuthCookies(res: Response): void {
  res.clearCookie(ADMIN_TOKEN_COOKIE, { path: '/' });
  // Defensively clears the old (now-unused) CSRF cookie too, so anyone who
  // picked one up before this fix has it cleaned up on their next sign-out.
  res.clearCookie(ADMIN_CSRF_COOKIE, { path: '/' });
}
