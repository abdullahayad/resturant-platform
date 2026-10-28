import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireJwtSecret } from '../auth/jwt-secret';

// Customer tokens, login-code hashes and visit codes each use their own key,
// derived from JWT_SECRET (so no extra setting on the server). Using a
// different key from partner/admin tokens matters: JwtStrategy only accepts
// tokens signed with JWT_SECRET itself, so a customer token can never pass
// any partner or admin route - not even ones that only check "is logged in".
function derivedKey(purpose: string): string {
  return createHmac('sha256', requireJwtSecret()).update(`ligeta-customer:${purpose}`).digest('hex');
}

export const customerTokenSecret = () => derivedKey('token');

export function hashLoginCode(phone: string, code: string): string {
  return createHmac('sha256', derivedKey('login-code')).update(`${phone}:${code}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// "My visit code" - what the customer's QR shows and the partner app scans.
// It changes every minute and is signed, so a screenshot stops working a
// couple of minutes later and nobody can make one up for someone else.
// Format: LGV1.<customerId>.<minute>.<signature>
const VISIT_CODE_PREFIX = 'LGV1';
const WINDOW_MS = 60_000;

function visitSignature(customerId: string, window: number): string {
  return createHmac('sha256', derivedKey('visit-code'))
    .update(`${customerId}.${window}`)
    .digest('base64url')
    .slice(0, 22);
}

export function makeVisitCode(customerId: string, now = new Date()): { code: string; expiresInSeconds: number } {
  const window = Math.floor(now.getTime() / WINDOW_MS);
  const expiresInSeconds = Math.ceil(((window + 1) * WINDOW_MS - now.getTime()) / 1000);
  return {
    code: `${VISIT_CODE_PREFIX}.${customerId}.${window}.${visitSignature(customerId, window)}`,
    expiresInSeconds,
  };
}

// The customer id inside a genuine code from this minute or the one before
// (so a code shown at :59 still scans at :01), otherwise null.
export function readVisitCode(code: string, now = new Date()): string | null {
  const parts = code.trim().split('.');
  if (parts.length !== 4 || parts[0] !== VISIT_CODE_PREFIX) return null;
  const [, customerId, windowText, signature] = parts;
  const window = Number(windowText);
  const current = Math.floor(now.getTime() / WINDOW_MS);
  if (!Number.isInteger(window) || window > current || window < current - 1) return null;
  return safeEqual(signature, visitSignature(customerId, window)) ? customerId : null;
}
