import { Test } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  beforeEach(async () => {
    prisma = {
      db: {
        review: { findMany: jest.fn().mockResolvedValue([]) },
        chefTableBooking: { findMany: jest.fn().mockResolvedValue([]) },
        notificationRecipient: { findMany: jest.fn().mockResolvedValue([]) },
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

    const result = await service.recentActivity('r1', true);

    expect(result.map((i) => i.id)).toEqual(['b1', 'r1', 'n1']); // newest (12:00) to oldest (08:00)
    expect(result[0]).toEqual(expect.objectContaining({ type: 'reservation', guestName: 'Sara' }));
  });

  it('omits reservations entirely for MENU_EDITOR staff, without even querying for them', async () => {
    await service.recentActivity('r1', false);

    expect(prisma.db.chefTableBooking.findMany).not.toHaveBeenCalled();
  });

  it('trims to the 20 most recent items across all sources combined', async () => {
    const manyReviews = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      reviewerName: 'X',
      rating: 5,
      createdAt: new Date(2026, 8, 15, 0, i), // ascending minutes, all distinct
    }));
    const manyAnnouncements = Array.from({ length: 15 }, (_, i) => ({
      id: `n${i}`,
      notification: { titleEn: 'X', titleAr: 'X', createdAt: new Date(2026, 8, 14, 0, i) }, // one day earlier - always older
    }));
    prisma.db.review.findMany.mockResolvedValueOnce(manyReviews);
    prisma.db.notificationRecipient.findMany.mockResolvedValueOnce(manyAnnouncements);

    const result = await service.recentActivity('r1', false);

    expect(result).toHaveLength(20);
    // The 15 (more recent) reviews should all be kept before any announcement shows up.
    expect(result.filter((i) => i.type === 'review')).toHaveLength(15);
    expect(result.filter((i) => i.type === 'announcement')).toHaveLength(5);
  });
});
