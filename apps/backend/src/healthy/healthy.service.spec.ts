import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HealthyService } from './healthy.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('HealthyService', () => {
  let service: HealthyService;
  let prisma: {
    db: {
      restaurant: { findUnique: jest.Mock; update: jest.Mock };
      dish: { count: jest.Mock };
    };
  };
  const user = { sub: 'r1', type: 'partner' } as PartnerJwtPayload;
  const restaurant = (healthyStatus: string) => ({
    healthyStatus,
    healthyRequestedAt: null,
    healthyRequestNote: null,
    healthyRejectionReason: null,
    healthyReviewedAt: null,
  });

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findUnique: jest.fn(), update: jest.fn() },
        dish: { count: jest.fn().mockResolvedValue(2) },
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        HealthyService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(HealthyService);
  });

  it('puts a request in the queue, clearing an earlier rejection', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValue(restaurant('REJECTED'));

    await service.request('r1', '  All grilled, no fryer  ', user);

    const [{ data }] = prisma.db.restaurant.update.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data).toMatchObject({
      healthyStatus: 'PENDING',
      healthyRequestNote: 'All grilled, no fryer',
      healthyRejectionReason: null,
    });
  });

  it('needs at least one healthy dish, and no request already in place', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValue(restaurant('NONE'));
    prisma.db.dish.count.mockResolvedValueOnce(0);
    await expect(service.request('r1', undefined, user)).rejects.toThrow(BadRequestException);

    prisma.db.restaurant.findUnique.mockResolvedValue(restaurant('PENDING'));
    await expect(service.request('r1', undefined, user)).rejects.toThrow(BadRequestException);
    expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
  });

  it('lets an admin approve, and needs a reason to reject or remove', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValue({ id: 'r1', ...restaurant('PENDING') });

    const lastData = () => {
      const calls = prisma.db.restaurant.update.mock.calls as [{ data: Record<string, unknown> }][];
      return calls[calls.length - 1][0].data;
    };

    await service.adminDecide('r1', true);
    expect(lastData()).toMatchObject({ healthyStatus: 'APPROVED' });

    await expect(service.adminDecide('r1', false, '  ')).rejects.toThrow(BadRequestException);
    await service.adminDecide('r1', false, 'Mostly fried dishes');
    expect(lastData()).toMatchObject({ healthyStatus: 'REJECTED', healthyRejectionReason: 'Mostly fried dishes' });
  });
});
