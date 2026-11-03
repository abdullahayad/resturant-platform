import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RestaurantCustomersService } from './restaurant-customers.service';
import { FollowsService } from './follows.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

describe('RestaurantCustomersService', () => {
  let service: RestaurantCustomersService;
  let prisma: {
    db: {
      customerVisit: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
      customerFollow: { count: jest.Mock };
    };
  };
  // Wednesday 2026-10-28, 12:30 in Baghdad.
  const now = new Date('2026-10-28T09:30:00Z');

  beforeEach(async () => {
    prisma = {
      db: {
        customerVisit: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn(), findMany: jest.fn() },
        customerFollow: { count: jest.fn().mockResolvedValue(7) },
      },
    };
    const module = await Test.createTestingModule({
      providers: [RestaurantCustomersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RestaurantCustomersService);
  });

  it('counts today and the last 7 Baghdad days, unique and returning customers, and followers', async () => {
    prisma.db.customerVisit.count.mockResolvedValueOnce(2).mockResolvedValueOnce(5).mockResolvedValueOnce(9);
    prisma.db.customerVisit.groupBy.mockResolvedValueOnce([
      { customerId: 'a', _count: { _all: 4 } },
      { customerId: 'b', _count: { _all: 1 } },
      { customerId: 'c', _count: { _all: 2 } },
    ]);

    const summary = await service.summary('r1', now);

    const calls = prisma.db.customerVisit.count.mock.calls as [{ where: object }][];
    expect(calls[0][0].where).toEqual({ restaurantId: 'r1', visitDate: '2026-10-28' });
    expect(calls[1][0].where).toEqual({ restaurantId: 'r1', visitDate: { gte: '2026-10-22' } });
    expect(summary).toEqual({
      visitsToday: 2,
      visitsThisWeek: 5,
      totalVisits: 9,
      uniqueCustomers: 3,
      returningCustomers: 2,
      followers: 7,
    });
  });

  it("lists visits with the customer's level, visits here, and never the full phone number", async () => {
    prisma.db.customerVisit.findMany.mockResolvedValueOnce([
      {
        id: 'v1',
        visitDate: '2026-10-28',
        createdAt: now,
        customerId: 'a',
        customer: { name: null, phone: '07701234567' },
      },
    ]);
    prisma.db.customerVisit.count.mockResolvedValueOnce(1);
    prisma.db.customerVisit.groupBy
      .mockResolvedValueOnce([{ customerId: 'a', _count: { _all: 12 } }])
      .mockResolvedValueOnce([{ customerId: 'a', _count: { _all: 3 } }]);

    const { items } = await service.visits('r1', 1);

    expect(items).toEqual([
      { id: 'v1', visitDate: '2026-10-28', createdAt: now, customerName: '•••• 4567', level: 3, visitsHere: 3 },
    ]);
  });
});

describe('FollowsService', () => {
  let service: FollowsService;
  let prisma: {
    db: { restaurant: { findFirst: jest.Mock }; customerFollow: { create: jest.Mock; deleteMany: jest.Mock } };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findFirst: jest.fn().mockResolvedValue({ id: 'r1' }) },
        customerFollow: { create: jest.fn(), deleteMany: jest.fn() },
      },
    };
    const module = await Test.createTestingModule({
      providers: [FollowsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(FollowsService);
  });

  it('treats following twice as fine, and refuses restaurants that are not live', async () => {
    prisma.db.customerFollow.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(service.follow('c1', 'r1')).resolves.toEqual({ following: true });

    prisma.db.restaurant.findFirst.mockResolvedValueOnce(null);
    await expect(service.follow('c1', 'hidden')).rejects.toThrow(NotFoundException);
  });
});
