import { Test } from '@nestjs/testing';
import { AdminActivityService } from './admin-activity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminActivityService', () => {
  let service: AdminActivityService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  const restaurant = (id: string) => ({ id, nameEn: `R${id}`, nameAr: `م${id}`, codeNumber: `C${id}` });

  beforeEach(async () => {
    prisma = {
      db: {
        dish: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        galleryPhoto: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        promotion: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        restaurantEvent: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      },
    };

    const module = await Test.createTestingModule({
      providers: [AdminActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AdminActivityService);
  });

  it('merges dishes, photos, promotions, and events across every restaurant, newest first', async () => {
    prisma.db.dish.findMany.mockResolvedValueOnce([
      { id: 'd1', nameEn: 'Kebab', nameAr: 'كباب', createdAt: new Date('2026-09-15T10:00:00Z'), restaurant: restaurant('r1') },
    ]);
    prisma.db.galleryPhoto.findMany.mockResolvedValueOnce([
      { id: 'p1', album: 'FOOD', createdAt: new Date('2026-09-15T12:00:00Z'), restaurant: restaurant('r2') },
    ]);
    prisma.db.promotion.findMany.mockResolvedValueOnce([
      { id: 'pr1', titleEn: 'Sale', titleAr: 'تخفيض', createdAt: new Date('2026-09-15T08:00:00Z'), restaurant: restaurant('r3') },
    ]);

    const result = await service.recentActivity(1);

    expect(result.items.map((i) => i.id)).toEqual(['p1', 'd1', 'pr1']);
    expect(result.items[0]).toEqual(expect.objectContaining({ type: 'photo', restaurant: restaurant('r2') }));
  });

  it('page 1 returns the 20 most recent items across all sources combined', async () => {
    const manyDishes = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      nameEn: 'X',
      nameAr: 'X',
      createdAt: new Date(2026, 8, 15, 0, i),
      restaurant: restaurant('r1'),
    }));
    prisma.db.dish.findMany.mockResolvedValueOnce(manyDishes.slice(5, 25));
    prisma.db.dish.count.mockResolvedValueOnce(25);

    const result = await service.recentActivity(1);

    expect(result.items).toHaveLength(20);
    expect(result.total).toBe(25);
  });
});
