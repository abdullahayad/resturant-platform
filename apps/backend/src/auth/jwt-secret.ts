// No hardcoded fallback: a committed default secret is itself a security
// hole (see security review) even if it happens to be labeled "dev-only" —
// anyone who reads the source can forge tokens with it. Fail loudly instead.
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET is not set (or is too short). Set a real secret in your .env file before starting the server.',
    );
  }
  return secret;
}
