import { Test } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: { db: { promotion: { count: jest.Mock } } };

  beforeEach(async () => {
    prisma = { db: { promotion: { count: jest.fn().mockResolvedValue(0) } } };

    const module = await Test.createTestingModule({
      providers: [PromotionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PromotionsService);
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
