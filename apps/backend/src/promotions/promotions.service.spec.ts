import { Test } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: {
    db: { promotion: { count: jest.Mock; create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  };

  beforeEach(async () => {
    prisma = {
      db: {
        promotion: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    const module = await Test.createTestingModule({
      providers: [PromotionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PromotionsService);
  });

  describe('create', () => {
    it('goes live immediately (status APPROVED) instead of waiting on admin review', async () => {
      prisma.db.promotion.create.mockResolvedValueOnce({});

      await service.create('r1', {
        titleEn: 'Sale',
        titleAr: 'تخفيض',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        scope: 'WHOLE_MENU',
        isRecurring: false,
        validFrom: '2026-09-01',
        validUntil: '2026-09-30',
      });

      expect(prisma.db.promotion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });
  });

  describe('update', () => {
    it('does not touch status when editing a promotion, unlike the old approval-reset behavior', async () => {
      prisma.db.promotion.findUnique.mockResolvedValueOnce({
        restaurantId: 'r1',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        scope: 'WHOLE_MENU',
      });
      prisma.db.promotion.update.mockResolvedValueOnce({});

      await service.update('r1', 'p1', { titleEn: 'New title' });

      const data = prisma.db.promotion.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('rejectionReason');
    });
  });

  describe('activePromotionsNow', () => {
    it('only asks for promotions that are active and not rejected, then filters by schedule', async () => {
      const now = new Date();
      prisma.db.promotion.findMany.mockResolvedValueOnce([
        {
          scope: 'WHOLE_MENU',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          isRecurring: false,
          validFrom: new Date(now.getTime() - 86_400_000),
          validUntil: new Date(now.getTime() + 86_400_000),
          recurringDayOfWeek: null,
          startTime: null,
          endTime: null,
          dishes: [],
        },
        {
          scope: 'WHOLE_MENU',
          discountType: 'FIXED_AMOUNT',
          discountValue: 500,
          isRecurring: false,
          validFrom: new Date(now.getTime() - 172_800_000),
          validUntil: new Date(now.getTime() - 86_400_000), // already ended
          recurringDayOfWeek: null,
          startTime: null,
          endTime: null,
          dishes: [],
        },
      ]);

      const result = await service.activePromotionsNow('r1');

      expect(prisma.db.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', isActive: true, status: { not: 'REJECTED' } } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].discountValue).toBe(10);
    });
  });

  describe('summary', () => {
    it('reports counts broken down by status, active-now, and discount type', async () => {
      prisma.db.promotion.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(6) // approved
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(4) // active now
        .mockResolvedValueOnce(7) // percentage
        .mockResolvedValueOnce(3); // fixed amount

      const result = await service.summary('r1');

      expect(result).toEqual({
        total: 10,
        byStatus: { PENDING: 2, APPROVED: 6, REJECTED: 2 },
        activeNow: 4,
        byDiscountType: { PERCENTAGE: 7, FIXED_AMOUNT: 3 },
      });
      expect(prisma.db.promotion.count).toHaveBeenCalledWith({ where: { restaurantId: 'r1' } });
      expect(prisma.db.promotion.count).toHaveBeenCalledWith({
        where: { restaurantId: 'r1', status: 'APPROVED', isActive: true },
      });
    });

    it('reports all zeros for a restaurant with no promotions yet', async () => {
      const result = await service.summary('r1');

      expect(result).toEqual({
        total: 0,
        byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
        activeNow: 0,
        byDiscountType: { PERCENTAGE: 0, FIXED_AMOUNT: 0 },
      });
    });
  });
});
