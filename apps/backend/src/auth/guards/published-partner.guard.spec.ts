import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { PublishedPartnerGuard } from './published-partner.guard';
import { ApprovedPartnerGuard } from './approved-partner.guard';

describe('PublishedPartnerGuard', () => {
  const prisma = { db: { restaurant: { findUnique: jest.fn() } } };
  const guard = new PublishedPartnerGuard(prisma as never);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'r1' } }) }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(ApprovedPartnerGuard.prototype, 'canActivate').mockResolvedValue(true);
  });

  it('lets a published restaurant through', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'APPROVED' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('stops a restaurant still setting up or waiting for review', async () => {
    for (const publishStatus of ['NOT_SUBMITTED', 'PENDING', 'REJECTED']) {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    }
  });
});
