import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';

// Sentry's NestJS integration only reports "unexpected" errors by default -
// an HttpException under 500 (which is exactly what a throttle rejection is,
// a 429) is treated as an expected, handled response and never reaches
// Sentry at all. That means the one signal most worth alerting on - someone
// hammering a sensitive endpoint hard enough to actually trip the rate
// limit, e.g. a login brute-force or a password-reset-code guessing attempt
// - was invisible to Sentry before this. This guard is the global
// ThrottlerGuard (see app.module.ts) with one addition: every time a
// request actually gets throttled, it also sends a Sentry event carrying
// the route and the tightest-matching limit that tripped, which is enough
// to tell an "unlucky real user retried too fast" apart from "someone is
// hammering /auth/partner/login" without needing to read raw server logs.
@Injectable()
export class SecurityAlertThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    Sentry.captureMessage(`Rate limit exceeded: ${req.method} ${req.originalUrl ?? req.url}`, {
      level: 'warning',
      tags: { kind: 'rate-limit-exceeded' },
      extra: {
        ip: req.ip,
        limit: throttlerLimitDetail.limit,
        ttl: throttlerLimitDetail.ttl,
      },
    });
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
