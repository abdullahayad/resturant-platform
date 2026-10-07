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
        restaurantActivityLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        blockedUpload: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        adminSupportSession: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      },
    };

    const module = await Test.createTestingModule({
      providers: [AdminActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AdminActivityService);
  });

  describe('a section selected (e.g. "menu")', () => {
    it('queries RestaurantActivityLog filtered to that section with plain skip/take pagination', async () => {
      prisma.db.restaurantActivityLog.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          section: 'menu',
          summary: "Added dish 'Kebab' (5000)",
          changes: null,
          createdAt: new Date('2026-09-15T10:00:00Z'),
          restaurant: restaurant('r1'),
          staff: null,
          impersonatedByAdmin: null,
        },
      ]);
      prisma.db.restaurantActivityLog.count.mockResolvedValueOnce(1);

      const result = await service.recentActivity(1, 'menu');

      expect(prisma.db.restaurantActivityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { section: 'menu' }, skip: 0, take: 20 }),
      );
      expect(result.items).toEqual([
        expect.objectContaining({
          type: 'restaurantActivity',
          id: 'a1',
          section: 'menu',
          summary: "Added dish 'Kebab' (5000)",
          changes: null,
          restaurant: restaurant('r1'),
          actor: { kind: 'owner', name: null },
        }),
      ]);
      expect(result.total).toBe(1);
    });

    it('resolves the actor to staff when staffId is set, and to an admin when impersonatedByAdminId is set', async () => {
      prisma.db.restaurantActivityLog.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          section: 'profile',
          summary: 'District: Rusafa → Zayouna',
          changes: [{ field: 'District', from: 'Rusafa', to: 'Zayouna' }],
          createdAt: new Date(),
          restaurant: restaurant('r1'),
          staff: { fullName: 'Sara Staff' },
          impersonatedByAdmin: null,
        },
        {
          id: 'a2',
          section: 'profile',
          summary: 'Name (EN): Old → New',
          changes: [{ field: 'Name (EN)', from: 'Old', to: 'New' }],
          createdAt: new Date(),
          restaurant: restaurant('r1'),
          staff: null,
          impersonatedByAdmin: { fullName: 'Ali Admin' },
        },
      ]);
      prisma.db.restaurantActivityLog.count.mockResolvedValueOnce(2);

      const result = await service.recentActivity(1, 'profile');

      expect(result.items[0]).toEqual(expect.objectContaining({ actor: { kind: 'staff', name: 'Sara Staff' } }));
      expect(result.items[1]).toEqual(expect.objectContaining({ actor: { kind: 'admin', name: 'Ali Admin' } }));
    });
  });

  describe('section: "blockedUpload"', () => {
    it("queries BlockedUpload directly, including one with no restaurant (an admin's own blocked upload)", async () => {
      prisma.db.blockedUpload.findMany.mockResolvedValueOnce([
        {
          id: 'b1',
          originalName: 'bad.jpg',
          createdAt: new Date('2026-09-15T14:00:00Z'),
          restaurant: restaurant('r1'),
        },
        { id: 'b2', originalName: 'other.png', createdAt: new Date('2026-09-15T09:00:00Z'), restaurant: null },
      ]);
      prisma.db.blockedUpload.count.mockResolvedValueOnce(2);

      const result = await service.recentActivity(1, 'blockedUpload');

      expect(result.items[0]).toEqual(
        expect.objectContaining({ type: 'blockedUpload', originalName: 'bad.jpg', restaurant: restaurant('r1') }),
      );
      expect(result.items[1]).toEqual(expect.objectContaining({ type: 'blockedUpload', restaurant: null }));
      expect(prisma.db.restaurantActivityLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe('section: "adminSupportSession"', () => {
    it('queries AdminSupportSession directly, tagged with the admin who started it', async () => {
      prisma.db.adminSupportSession.findMany.mockResolvedValueOnce([
        {
          id: 's1',
          createdAt: new Date('2026-09-15T11:00:00Z'),
          admin: { fullName: 'Ali Admin' },
          restaurant: restaurant('r1'),
        },
      ]);
      prisma.db.adminSupportSession.count.mockResolvedValueOnce(1);

      const result = await service.recentActivity(1, 'adminSupportSession');

      expect(result.items[0]).toEqual(
        expect.objectContaining({ type: 'adminSupportSession', adminName: 'Ali Admin', restaurant: restaurant('r1') }),
      );
    });
  });

  describe('no section ("All")', () => {
    it('merges restaurant activity, blocked uploads, and support sessions, newest first', async () => {
      prisma.db.restaurantActivityLog.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          section: 'menu',
          summary: 'x',
          changes: null,
          createdAt: new Date('2026-09-15T10:00:00Z'),
          restaurant: restaurant('r1'),
          staff: null,
          impersonatedByAdmin: null,
        },
      ]);
      prisma.db.blockedUpload.findMany.mockResolvedValueOnce([
        {
          id: 'b1',
          originalName: 'bad.jpg',
          createdAt: new Date('2026-09-15T14:00:00Z'),
          restaurant: restaurant('r2'),
        },
      ]);
      prisma.db.adminSupportSession.findMany.mockResolvedValueOnce([
        {
          id: 's1',
          createdAt: new Date('2026-09-15T08:00:00Z'),
          admin: { fullName: 'Ali Admin' },
          restaurant: restaurant('r3'),
        },
      ]);

      const result = await service.recentActivity(1);

      expect(result.items.map((i) => i.id)).toEqual(['b1', 'a1', 's1']);
    });

    it('page 1 returns the 20 most recent items across all sources combined', async () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        id: `a${i}`,
        section: 'menu',
        summary: 'x',
        changes: null,
        createdAt: new Date(2026, 8, 15, 0, i),
        restaurant: restaurant('r1'),
        staff: null,
        impersonatedByAdmin: null,
      }));
      prisma.db.restaurantActivityLog.findMany.mockResolvedValueOnce(manyRows.slice(5, 25));
      prisma.db.restaurantActivityLog.count.mockResolvedValueOnce(25);

      const result = await service.recentActivity(1);

      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
    });
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
