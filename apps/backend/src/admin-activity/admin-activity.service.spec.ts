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
        blockedUpload: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        adminSupportSession: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      },
    };

    const module = await Test.createTestingModule({
      providers: [AdminActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AdminActivityService);
  });

  // price/discountValue only need a .toFixed() method, same as a real
  // Prisma Decimal - a plain JS number satisfies that without pulling in
  // the Decimal class just for these tests.
  it('merges dishes, photos, promotions, and events across every restaurant, newest first', async () => {
    prisma.db.dish.findMany.mockResolvedValueOnce([
      {
        id: 'd1',
        nameEn: 'Kebab',
        nameAr: 'كباب',
        photoUrl: null,
        price: 5000,
        menuCategory: null,
        createdAt: new Date('2026-09-15T10:00:00Z'),
        restaurant: restaurant('r1'),
      },
    ]);
    prisma.db.galleryPhoto.findMany.mockResolvedValueOnce([
      { id: 'p1', album: 'FOOD', url: 'https://example.com/p1.jpg', caption: null, createdAt: new Date('2026-09-15T12:00:00Z'), restaurant: restaurant('r2') },
    ]);
    prisma.db.promotion.findMany.mockResolvedValueOnce([
      {
        id: 'pr1',
        titleEn: 'Sale',
        titleAr: 'تخفيض',
        descriptionEn: null,
        descriptionAr: null,
        photoUrl: null,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        createdAt: new Date('2026-09-15T08:00:00Z'),
        restaurant: restaurant('r3'),
      },
    ]);

    const result = await service.recentActivity(1);

    expect(result.items.map((i) => i.id)).toEqual(['p1', 'd1', 'pr1']);
    expect(result.items[0]).toEqual(expect.objectContaining({ type: 'photo', restaurant: restaurant('r2') }));
  });

  it('merges in blocked uploads, including one with no restaurant (an admin\'s own blocked upload)', async () => {
    prisma.db.blockedUpload.findMany.mockResolvedValueOnce([
      { id: 'b1', originalName: 'bad.jpg', createdAt: new Date('2026-09-15T14:00:00Z'), restaurant: restaurant('r1') },
      { id: 'b2', originalName: 'other.png', createdAt: new Date('2026-09-15T09:00:00Z'), restaurant: null },
    ]);

    const result = await service.recentActivity(1);

    expect(result.items[0]).toEqual(
      expect.objectContaining({ type: 'blockedUpload', originalName: 'bad.jpg', restaurant: restaurant('r1') }),
    );
    expect(result.items[1]).toEqual(expect.objectContaining({ type: 'blockedUpload', restaurant: null }));
  });

  it('page 1 returns the 20 most recent items across all sources combined', async () => {
    const manyDishes = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      nameEn: 'X',
      nameAr: 'X',
      photoUrl: null,
      price: 1000,
      menuCategory: null,
      createdAt: new Date(2026, 8, 15, 0, i),
      restaurant: restaurant('r1'),
    }));
    prisma.db.dish.findMany.mockResolvedValueOnce(manyDishes.slice(5, 25));
    prisma.db.dish.count.mockResolvedValueOnce(25);

    const result = await service.recentActivity(1);

    expect(result.items).toHaveLength(20);
    expect(result.total).toBe(25);
  });

  it('merges in "Manage as this restaurant" support sessions, tagged with the admin who started them', async () => {
    prisma.db.adminSupportSession.findMany.mockResolvedValueOnce([
      { id: 's1', createdAt: new Date('2026-09-15T11:00:00Z'), admin: { fullName: 'Ali Admin' }, restaurant: restaurant('r1') },
    ]);

    const result = await service.recentActivity(1);

    expect(result.items[0]).toEqual(
      expect.objectContaining({ type: 'adminSupportSession', adminName: 'Ali Admin', restaurant: restaurant('r1') }),
    );
  });

  describe('recentBlockedCount', () => {
    it('only counts blocked uploads from the last 24 hours', async () => {
      prisma.db.blockedUpload.count.mockResolvedValueOnce(3);

      const result = await service.recentBlockedCount();

      expect(result).toEqual({ count: 3 });
      const call = prisma.db.blockedUpload.count.mock.calls[0][0];
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
      // Within a few seconds of "now minus 24h" - not asserting an exact
      // timestamp, which would make this test flaky.
      const expectedCutoff = Date.now() - 24 * 60 * 60 * 1000;
      expect(Math.abs(call.where.createdAt.gte.getTime() - expectedCutoff)).toBeLessThan(5000);
    });
  });
});
