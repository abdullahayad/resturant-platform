import { Test } from '@nestjs/testing';
import { FeaturedService } from './featured.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';

describe('FeaturedService', () => {
  let service: FeaturedService;
  let prisma: { db: { featuredPlacement: { findMany: jest.Mock } } };

  beforeEach(async () => {
    prisma = { db: { featuredPlacement: { findMany: jest.fn() } } };

    const module = await Test.createTestingModule({
      providers: [
        FeaturedService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(FeaturedService);
  });

  describe('isFeatured', () => {
    it('is false when the restaurant has no approved+active placement at all', async () => {
      prisma.db.featuredPlacement.findMany.mockResolvedValueOnce([]);

      expect(await service.isFeatured('r1')).toBe(false);
    });

    it('is true for an approved, active placement with no date window', async () => {
      prisma.db.featuredPlacement.findMany.mockResolvedValueOnce([
        { status: 'APPROVED', isActive: true, startDate: null, endDate: null },
      ]);

      expect(await service.isFeatured('r1')).toBe(true);
    });

    it('is false when the placement has not started yet', async () => {
      const future = new Date(Date.now() + 86_400_000);
      prisma.db.featuredPlacement.findMany.mockResolvedValueOnce([
        { status: 'APPROVED', isActive: true, startDate: future, endDate: null },
      ]);

      expect(await service.isFeatured('r1')).toBe(false);
    });

    it('is false when the placement already ended', async () => {
      const past = new Date(Date.now() - 86_400_000);
      prisma.db.featuredPlacement.findMany.mockResolvedValueOnce([
        { status: 'APPROVED', isActive: true, startDate: null, endDate: past },
      ]);

      expect(await service.isFeatured('r1')).toBe(false);
    });

    it('is true if any one of several placements is currently in its active window', async () => {
      const past = new Date(Date.now() - 86_400_000);
      const future = new Date(Date.now() + 86_400_000);
      prisma.db.featuredPlacement.findMany.mockResolvedValueOnce([
        { status: 'APPROVED', isActive: true, startDate: future, endDate: null }, // not started
        { status: 'APPROVED', isActive: true, startDate: past, endDate: null }, // live
      ]);

      expect(await service.isFeatured('r1')).toBe(true);
    });
  });
});
