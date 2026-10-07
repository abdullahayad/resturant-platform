import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';
import { SecurityAlertThrottlerGuard } from './security-alert-throttler.guard';

jest.mock('@sentry/nestjs', () => ({ captureMessage: jest.fn() }));

describe('SecurityAlertThrottlerGuard', () => {
  // The base ThrottlerGuard's constructor args (module options, storage,
  // reflector) are irrelevant here - this test only exercises the
  // throwThrottlingException override, never the real rate-counting logic.
  const guard = new SecurityAlertThrottlerGuard({} as never, {} as never, {} as never);

  const fakeContext = (overrides: Partial<{ method: string; originalUrl: string; ip: string }> = {}) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', originalUrl: '/v1/auth/partner/login', ip: '203.0.113.5', ...overrides }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('sends a Sentry warning with the route and limit details before throttling', async () => {
    await expect(
      (
        guard as unknown as { throwThrottlingException: (ctx: ExecutionContext, detail: unknown) => Promise<void> }
      ).throwThrottlingException(fakeContext(), { limit: 10, ttl: 60_000, key: 'k', tracker: 't', totalHits: 11 }),
    ).rejects.toThrow(ThrottlerException);

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Rate limit exceeded: POST /v1/auth/partner/login',
      expect.objectContaining({
        level: 'warning',
        tags: { kind: 'rate-limit-exceeded' },
        extra: { ip: '203.0.113.5', limit: 10, ttl: 60_000 },
      }),
    );
  });

  it('still throws ThrottlerException even if the request has no originalUrl (falls back to url)', async () => {
    await expect(
      (
        guard as unknown as { throwThrottlingException: (ctx: ExecutionContext, detail: unknown) => Promise<void> }
      ).throwThrottlingException(fakeContext({ originalUrl: undefined as unknown as string }), {
        limit: 5,
        ttl: 60_000,
        key: 'k',
        tracker: 't',
        totalHits: 6,
      }),
    ).rejects.toThrow(ThrottlerException);
  });
});
