import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM. No hardcoded fallback - a committed default key is itself a
// security hole even labeled "dev-only" (same reasoning as jwt-secret.ts).
// Fail loudly instead of silently storing something an attacker with DB
// access could just decrypt with the source code.
function requireEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'PAYMENT_CREDENTIALS_ENCRYPTION_KEY is not set. Set a base64-encoded 32-byte key in your .env file before starting the server.',
    );
  }
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) {
    throw new Error('PAYMENT_CREDENTIALS_ENCRYPTION_KEY must decode (base64) to exactly 32 bytes.');
  }
  return buf;
}

// Stored as "iv:authTag:cipherText", each base64 - one column, not a JSON
// blob, since every caller here only ever encrypts one string at a time.
export function encryptSecret(plainText: string): string {
  const key = requireEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${cipherText.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const key = requireEncryptionKey();
  const [ivB64, authTagB64, cipherTextB64] = stored.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(cipherTextB64, 'base64')), decipher.final()]).toString('utf8');
}
