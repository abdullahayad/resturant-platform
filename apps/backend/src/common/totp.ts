import { createHmac, randomBytes } from 'node:crypto';

// Minimal RFC 4226 (HOTP) / RFC 6238 (TOTP) implementation - no dependency
// needed since it's just an HMAC over a time counter, which node:crypto
// already gives us. 6-digit codes, 30s steps, matching every authenticator
// app (Google Authenticator, Authy, etc.) out of the box.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

export function generateBase32Secret(byteLength = 20): string {
  const buffer = randomBytes(byteLength);
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');

  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(base32: string): Buffer {
  const clean = base32.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (truncated % 1_000_000).toString().padStart(6, '0');
}

// Accepts the current 30s step and one step on either side, so a code
// typed just as the clock ticks over (or a slightly-off phone clock)
// still works - the same tolerance every authenticator app assumes.
export function verifyTotp(base32Secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let drift = -1; drift <= 1; drift++) {
    if (hotp(secret, counter + drift) === code) return true;
  }
  return false;
}

export function buildOtpauthUrl(accountLabel: string, base32Secret: string): string {
  const label = encodeURIComponent(`LiGETA Admin:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${base32Secret}&issuer=LiGETA&digits=6&period=${STEP_SECONDS}`;
}
