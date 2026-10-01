import { createHmac } from 'node:crypto';
import { requireJwtSecret } from '../auth/jwt-secret';
import { normalizePhone } from './phone';

// A one-way HMAC, not the raw phone number - this value only ever needs to
// answer "is this the same phone number as before", never "what is this
// phone number", so there's no reason to store anything reversible.
// Normalizing first (see phone.ts) means "0770..." and "+964770..." hash
// identically, same as everywhere else a guest phone number is matched.
export function hashReviewerPhone(rawPhone: string): string {
  return createHmac('sha256', requireJwtSecret()).update(normalizePhone(rawPhone)).digest('hex');
}
