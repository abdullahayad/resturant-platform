import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { Prisma } from '../../generated/prisma/client';
import { makeVisitCode } from './customer-secrets';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('CustomersService.scanVisit', () => {
  let service: CustomersService;
  let prisma: {
    db: {
      customer: { findUnique: jest.Mock };
      customerVisit: { create: jest.Mock; count: jest.Mock };
    };
  };
  let flags: { resolveEnabledKeys: jest.Mock };
  // 22:30 UTC on the 28th is already the 29th in Baghdad.
  const now = new Date('2026-10-28T22:30:00Z');
  const partner = { sub: 'rest-1', type: 'partner', staffId: 'staff-9' } as PartnerJwtPayload;

  beforeAll(() => {
    process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
  });

  beforeEach(async () => {
    prisma = {
      db: {
        customer: { findUnique: jest.fn().mockResolvedValue({ name: 'Ali', phone: '07701234567' }) },
        customerVisit: { create: jest.fn(), count: jest.fn().mockResolvedValue(3) },
      },
    };
    flags = { resolveEnabledKeys: jest.fn().mockResolvedValue(['visitScan']) };
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeatureFlagsService, useValue: flags },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  it('records a visit for the Baghdad day and returns the new level', async () => {
    const { code } = makeVisitCode('cust-1', now);

    const result = await service.scanVisit(partner, code, now);

    expect(prisma.db.customerVisit.create).toHaveBeenCalledWith({
      data: { customerId: 'cust-1', restaurantId: 'rest-1', visitDate: '2026-10-29', scannedByStaffId: 'staff-9' },
    });
    expect(result).toEqual({ customerName: 'Ali', level: 2, visitCount: 3, alreadyToday: false });
  });

  it('says "already today" for a second scan on the same day', async () => {
    prisma.db.customerVisit.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    const result = await service.scanVisit(partner, makeVisitCode('cust-1', now).code, now);
    expect(result.alreadyToday).toBe(true);
  });

  it('shows only the last digits when the customer has no name', async () => {
    prisma.db.customer.findUnique.mockResolvedValueOnce({ name: null, phone: '07701234567' });
    const result = await service.scanVisit(partner, makeVisitCode('cust-1', now).code, now);
    expect(result.customerName).toBe('•••• 4567');
  });

  it('refuses when the flag is off or the code is not genuine', async () => {
    flags.resolveEnabledKeys.mockResolvedValueOnce([]);
    await expect(service.scanVisit(partner, makeVisitCode('cust-1', now).code, now)).rejects.toThrow(
      ForbiddenException,
    );

    await expect(service.scanVisit(partner, 'LGV1.cust-1.1.forged', now)).rejects.toThrow(BadRequestException);
    expect(prisma.db.customerVisit.create).not.toHaveBeenCalled();
  });
});
