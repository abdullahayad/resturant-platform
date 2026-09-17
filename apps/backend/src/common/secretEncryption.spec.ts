import { encryptSecret, decryptSecret } from './secretEncryption';

describe('secretEncryption', () => {
  const originalEnv = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(() => {
    // 32 raw bytes, base64-encoded - a real key would come from the
    // environment, never committed to source.
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterEach(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = originalEnv;
  });

  it('decrypts back to the original plaintext', () => {
    const encrypted = encryptSecret('super-secret-merchant-key');
    expect(decryptSecret(encrypted)).toBe('super-secret-merchant-key');
  });

  it('never stores the plaintext itself in the encrypted output', () => {
    const encrypted = encryptSecret('super-secret-merchant-key');
    expect(encrypted).not.toContain('super-secret-merchant-key');
  });

  it('produces a different ciphertext each time (random IV), even for the same input', () => {
    const first = encryptSecret('same-value');
    const second = encryptSecret('same-value');
    expect(first).not.toBe(second);
  });

  it('throws instead of silently succeeding when the encryption key is missing', () => {
    delete process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(/PAYMENT_CREDENTIALS_ENCRYPTION_KEY/);
  });

  it('rejects a tampered ciphertext instead of returning corrupted plaintext', () => {
    const encrypted = encryptSecret('super-secret-merchant-key');
    const [iv, authTag, cipherText] = encrypted.split(':');
    const tampered = [iv, authTag, Buffer.from('tampered').toString('base64') + cipherText.slice(8)].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
