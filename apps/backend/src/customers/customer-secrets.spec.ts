import { makeVisitCode, readVisitCode } from './customer-secrets';
import { levelFor } from './customer-levels';

describe('visit codes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
  });

  const now = new Date('2026-10-28T09:30:10Z');

  it('reads back the customer from a fresh code', () => {
    const { code, expiresInSeconds } = makeVisitCode('cust-1', now);
    expect(readVisitCode(code, now)).toBe('cust-1');
    expect(expiresInSeconds).toBe(50);
  });

  it('still accepts a code from the previous minute, but not older', () => {
    const { code } = makeVisitCode('cust-1', now);
    expect(readVisitCode(code, new Date(now.getTime() + 60_000))).toBe('cust-1');
    expect(readVisitCode(code, new Date(now.getTime() + 120_000))).toBeNull();
  });

  it('rejects a code from the future, a forged signature or another customer id', () => {
    const { code } = makeVisitCode('cust-1', new Date(now.getTime() + 60_000));
    expect(readVisitCode(code, now)).toBeNull();

    const [prefix, , window, signature] = makeVisitCode('cust-1', now).code.split('.');
    expect(readVisitCode(`${prefix}.cust-2.${window}.${signature}`, now)).toBeNull();
    expect(readVisitCode(`${prefix}.cust-1.${window}.${'A'.repeat(22)}`, now)).toBeNull();
    expect(readVisitCode('not a code', now)).toBeNull();
  });
});

describe('levelFor', () => {
  it('moves up at 3, 10, 25 and 50 verified visits', () => {
    expect(levelFor(0)).toEqual({ level: 1, nextLevelAt: 3 });
    expect(levelFor(3)).toEqual({ level: 2, nextLevelAt: 10 });
    expect(levelFor(24)).toEqual({ level: 3, nextLevelAt: 25 });
    expect(levelFor(49).level).toBe(4);
    expect(levelFor(200)).toEqual({ level: 5, nextLevelAt: null });
  });
});
