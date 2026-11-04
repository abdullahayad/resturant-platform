import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';

describe('ReviewsService - verified visit badge', () => {
  let service: ReviewsService;
  let prisma: {
    db: {
      review: { findMany: jest.Mock; count: jest.Mock };
      customer: { findMany: jest.Mock };
    };
  };
  const day = 24 * 60 * 60 * 1000;
  const reviewedAt = new Date('2026-10-20T12:00:00Z');

  beforeEach(async () => {
    prisma = {
      db: {
        review: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(3) },
        customer: { findMany: jest.fn() },
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: {} },
        { provide: FeatureFlagsService, useValue: {} },
        { provide: RestaurantActivityLogService, useValue: {} },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  it('marks reviews whose phone matches a customer this restaurant scanned around that time', async () => {
    prisma.db.review.findMany
      // The page itself (phone hash omitted).
      .mockResolvedValueOnce([{ id: 'recent' }, { id: 'stale' }, { id: 'stranger' }])
      // The phone hashes, read only for matching.
      .mockResolvedValueOnce([
        { id: 'recent', reviewerPhoneHash: 'h1', createdAt: reviewedAt },
        { id: 'stale', reviewerPhoneHash: 'h2', createdAt: reviewedAt },
        { id: 'stranger', reviewerPhoneHash: 'h3', createdAt: reviewedAt },
      ])
      // Helpful counts and authors (critic links).
      .mockResolvedValueOnce([
        {
          id: 'recent',
          _count: { helpfulVotes: 4 },
          customer: {
            id: 'critic-1',
            isPublic: true,
            criticHidden: false,
            isStar: false,
            blockedAt: null,
            _count: { visits: 30 },
          },
        },
        {
          id: 'stale',
          _count: { helpfulVotes: 0 },
          customer: {
            id: 'private-1',
            isPublic: false,
            criticHidden: false,
            isStar: false,
            blockedAt: null,
            _count: { visits: 30 },
          },
        },
        { id: 'stranger', _count: { helpfulVotes: 1 }, customer: null },
      ]);
    prisma.db.customer.findMany.mockResolvedValueOnce([
      { phoneHash: 'h1', visits: [{ createdAt: new Date(reviewedAt.getTime() - 3 * day) }] },
      { phoneHash: 'h2', visits: [{ createdAt: new Date(reviewedAt.getTime() - 90 * day) }] },
    ]);

    const { items } = await service.listForRestaurant('rest-1', 1);

    expect(items.map((r) => [r.id, r.verifiedVisit])).toEqual([
      ['recent', true],
      ['stale', false],
      ['stranger', false],
    ]);
    // Helpful counts for all; a critic link only for the public critic, never
    // the private author's account id.
    expect(items.map((r) => [r.id, r.helpfulCount, r.criticId])).toEqual([
      ['recent', 4, 'critic-1'],
      ['stale', 0, null],
      ['stranger', 1, null],
    ]);
    // Only this restaurant's visits count.
    const [{ select }] = prisma.db.customer.findMany.mock.calls[0] as [{ select: { visits: { where: object } } }];
    expect(select.visits.where).toEqual({ restaurantId: 'rest-1' });
  });
});
