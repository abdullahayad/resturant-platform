import { Test } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  beforeEach(async () => {
    prisma = {
      db: {
        review: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        chefTableBooking: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        notificationRecipient: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      },
    };

    const module = await Test.createTestingModule({
      providers: [ActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ActivityService);
  });

  it('merges all three sources sorted newest-first, regardless of which source they came from', async () => {
    prisma.db.review.findMany.mockResolvedValueOnce([
      { id: 'r1', reviewerName: 'Ahmed', rating: 5, createdAt: new Date('2026-09-15T10:00:00Z') },
    ]);
    prisma.db.chefTableBooking.findMany.mockResolvedValueOnce([
      { id: 'b1', guestName: 'Sara', partySize: 4, createdAt: new Date('2026-09-15T12:00:00Z'), event: { titleEn: 'Chef Table' } },
    ]);
    prisma.db.notificationRecipient.findMany.mockResolvedValueOnce([
      { id: 'n1', notification: { titleEn: 'Update', titleAr: 'تحديث', createdAt: new Date('2026-09-15T08:00:00Z') } },
    ]);

    const result = await service.recentActivity('r1', true, 1);

    expect(result.items.map((i) => i.id)).toEqual(['b1', 'r1', 'n1']); // newest (12:00) to oldest (08:00)
    expect(result.items[0]).toEqual(expect.objectContaining({ type: 'reservation', guestName: 'Sara' }));
    expect(result).toEqual(expect.objectContaining({ page: 1, pageSize: 10 }));
  });

  it('omits reservations entirely for MENU_EDITOR staff, without even querying for them', async () => {
    await service.recentActivity('r1', false, 1);

    expect(prisma.db.chefTableBooking.findMany).not.toHaveBeenCalled();
    expect(prisma.db.chefTableBooking.count).not.toHaveBeenCalled();
  });

  it('page 1 returns the 10 most recent items across all sources combined', async () => {
    // 15 reviews, all newer than the 15 announcements below - index 14 is
    // the most recent within each source (ascending minutes).
    const manyReviews = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      reviewerName: 'X',
      rating: 5,
      createdAt: new Date(2026, 8, 15, 0, i),
    }));
    const manyAnnouncements = Array.from({ length: 15 }, (_, i) => ({
      id: `n${i}`,
      notification: { titleEn: 'X', titleAr: 'X', createdAt: new Date(2026, 8, 14, 0, i) },
    }));
    // A real "ORDER BY createdAt DESC LIMIT 10" for page 1 (fetchCount=10)
    // would return the 10 most recent - indices 5..14, not 0..9.
    prisma.db.review.findMany.mockResolvedValueOnce(manyReviews.slice(5, 15));
    prisma.db.notificationRecipient.findMany.mockResolvedValueOnce(manyAnnouncements.slice(5, 15));
    prisma.db.review.count.mockResolvedValueOnce(15);
    prisma.db.notificationRecipient.count.mockResolvedValueOnce(15);

    const result = await service.recentActivity('r1', false, 1);

    expect(result.items).toHaveLength(10);
    expect(result.items.every((i) => i.type === 'review')).toBe(true); // reviews are all newer
    expect(result.total).toBe(15 + 15);
  });

  it('page 2 correctly spans a boundary that falls in the middle of one source', async () => {
    // 15 reviews (newer), 15 announcements (older) - true merged order is
    // review#0..14 then announcement#0..14. Page 2 (items 11-20) should be
    // reviews #10-14 (the last 5 reviews) followed by announcements #0-4.
    const reviews = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      reviewerName: 'X',
      rating: 5,
      createdAt: new Date(2026, 8, 15, 12, 0, 0, 0 - i), // r0 newest, r14 oldest within reviews
    }));
    const announcements = Array.from({ length: 15 }, (_, i) => ({
      id: `n${i}`,
      notification: { titleEn: 'X', titleAr: 'X', createdAt: new Date(2026, 8, 14, 12, 0, 0, 0 - i) },
    }));
    // Page 2 asks for fetchCount = 2 * 10 = 20 from each source.
    prisma.db.review.findMany.mockResolvedValueOnce(reviews);
    prisma.db.notificationRecipient.findMany.mockResolvedValueOnce(announcements);
    prisma.db.review.count.mockResolvedValueOnce(15);
    prisma.db.notificationRecipient.count.mockResolvedValueOnce(15);

    const result = await service.recentActivity('r1', false, 2);

    expect(result.items.map((i) => i.id)).toEqual(['r10', 'r11', 'r12', 'r13', 'r14', 'n0', 'n1', 'n2', 'n3', 'n4']);
    expect(result.page).toBe(2);
  });
});
