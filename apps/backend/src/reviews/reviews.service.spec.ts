import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';

// hashReviewerPhone() needs a real JWT_SECRET (it's an HMAC key, not an
// auth token) - these tests exercise the real hash/normalize logic rather
// than mocking it away, since matching the same phone to a prior review is
// exactly the behavior under test.
process.env.JWT_SECRET = 'test-only-secret-at-least-16-chars';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    db: {
      restaurant: { findUnique: jest.Mock };
      review: { findFirst: jest.Mock; create: jest.Mock; findUnique: jest.Mock };
      galleryPhoto: { createMany: jest.Mock };
    };
  };
  let push: { sendToRestaurants: jest.Mock };

  const baseDto = {
    reviewerName: 'Test Customer',
    reviewerPhone: '07704404735',
    rating: 5,
  };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findUnique: jest.fn() },
        review: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
        galleryPhoto: { createMany: jest.fn() },
      },
    };
    push = { sendToRestaurants: jest.fn().mockResolvedValue(undefined) };

    prisma.db.restaurant.findUnique.mockResolvedValue({ status: 'APPROVED', notifyNewReview: false });
    prisma.db.review.findFirst.mockResolvedValue(null);
    prisma.db.review.create.mockResolvedValue({ id: 'r1' });
    prisma.db.review.findUnique.mockResolvedValue({ id: 'r1', reviewerName: 'Test Customer', rating: 5 });

    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
        { provide: FeatureFlagsService, useValue: { resolveEnabledKeys: jest.fn() } },
        { provide: RestaurantActivityLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('createForRestaurant', () => {
    it('rejects when the restaurant is not approved', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValue({ status: 'PENDING_REVIEW', notifyNewReview: false });

      await expect(service.createForRestaurant('rest1', baseDto)).rejects.toThrow(BadRequestException);
    });

    it('creates the review and stores a phone hash when no recent review exists from that phone', async () => {
      await service.createForRestaurant('rest1', baseDto);

      expect(prisma.db.review.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ restaurantId: 'rest1' }),
        }),
      );
      const createArgs = prisma.db.review.create.mock.calls[0][0];
      expect(createArgs.data.reviewerPhoneHash).toEqual(expect.any(String));
      expect(createArgs.data.reviewerPhoneHash).not.toContain('0770');
    });

    it('rejects a second review from the same phone at the same restaurant within 12 hours', async () => {
      prisma.db.review.findFirst.mockResolvedValue({ id: 'earlier-review' });

      await expect(service.createForRestaurant('rest1', baseDto)).rejects.toThrow(BadRequestException);
      await expect(service.createForRestaurant('rest1', baseDto)).rejects.toThrow('review-cooldown-active');
      expect(prisma.db.review.create).not.toHaveBeenCalled();
    });

    it('computes the same hash for differently-formatted versions of the same number', async () => {
      await service.createForRestaurant('rest1', { ...baseDto, reviewerPhone: '07704404735' });
      const hashA = prisma.db.review.create.mock.calls[0][0].data.reviewerPhoneHash;

      await service.createForRestaurant('rest1', { ...baseDto, reviewerPhone: '+9647704404735' });
      const hashB = prisma.db.review.create.mock.calls[1][0].data.reviewerPhoneHash;

      expect(hashA).toBe(hashB);
    });

    it('computes a different hash for a different phone number', async () => {
      await service.createForRestaurant('rest1', { ...baseDto, reviewerPhone: '07704404735' });
      const hashA = prisma.db.review.create.mock.calls[0][0].data.reviewerPhoneHash;

      await service.createForRestaurant('rest1', { ...baseDto, reviewerPhone: '07711112222' });
      const hashB = prisma.db.review.create.mock.calls[1][0].data.reviewerPhoneHash;

      expect(hashA).not.toBe(hashB);
    });

    it('creates gallery photos tagged to the review when photoUrls are provided', async () => {
      await service.createForRestaurant('rest1', {
        ...baseDto,
        photoUrls: ['https://pub-example.r2.dev/uploads/a.jpg', 'https://pub-example.r2.dev/uploads/b.jpg'],
      });

      expect(prisma.db.galleryPhoto.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ restaurantId: 'rest1', reviewId: 'r1' })]),
        }),
      );
    });
  });
});
