import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PreviewService } from './preview.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { PromotionsService } from '../promotions/promotions.service';
import { ReviewsService } from '../reviews/reviews.service';
import { FeaturedService } from '../featured/featured.service';

describe('PreviewService', () => {
  let service: PreviewService;
  let prisma: { db: { restaurant: { findUnique: jest.Mock } } };
  let events: { publicList: jest.Mock };
  let promotions: { activePromotionsNow: jest.Mock };
  let reviews: { listForRestaurant: jest.Mock };
  let featured: { isFeatured: jest.Mock };

  const baseRestaurant = {
    id: 'r1',
    nameEn: 'Test',
    nameAr: 'اختبار',
    dishes: [],
    galleryPhotos: [],
    chefProfiles: [],
    reviews: [],
  };

  beforeEach(async () => {
    prisma = { db: { restaurant: { findUnique: jest.fn() } } };
    events = { publicList: jest.fn().mockResolvedValue([]) };
    promotions = { activePromotionsNow: jest.fn().mockResolvedValue([]) };
    reviews = { listForRestaurant: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) };
    featured = { isFeatured: jest.fn().mockResolvedValue(false) };

    const module = await Test.createTestingModule({
      providers: [
        PreviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: events },
        { provide: PromotionsService, useValue: promotions },
        { provide: ReviewsService, useValue: reviews },
        { provide: FeaturedService, useValue: featured },
      ],
    }).compile();

    service = module.get(PreviewService);
  });

  it('throws NotFoundException when the restaurant does not exist', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

    await expect(service.get('missing')).rejects.toThrow(NotFoundException);
  });

  it('computes overallAverage and totalReviews from the fetched ratings, and strips the raw reviews array', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce({
      ...baseRestaurant,
      reviews: [{ rating: 5 }, { rating: 4 }, { rating: 4 }],
    });

    const result = await service.get('r1');

    expect(result.overallAverage).toBe(4.3);
    expect(result.totalReviews).toBe(3);
    expect(result).not.toHaveProperty('reviews');
  });

  it('returns a null average when there are no reviews yet', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce(baseRestaurant);

    const result = await service.get('r1');

    expect(result.overallAverage).toBeNull();
    expect(result.totalReviews).toBe(0);
  });

  it('merges in events from EventsService.publicList rather than querying them directly', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce(baseRestaurant);
    events.publicList.mockResolvedValueOnce([{ id: 'e1', titleEn: 'Chef Table' }]);

    const result = await service.get('r1');

    expect(events.publicList).toHaveBeenCalledWith('r1');
    expect(result.events).toEqual([{ id: 'e1', titleEn: 'Chef Table' }]);
  });

  it('attaches a discountedPrice to a dish covered by a currently-live promotion', async () => {
    prisma.db.restaurant.findUnique.mockResolvedValueOnce({
      ...baseRestaurant,
      dishes: [{ id: 'd1', price: 10000 }, { id: 'd2', price: 5000 }],
    });
    promotions.activePromotionsNow.mockResolvedValueOnce([
      { scope: 'SPECIFIC_DISHES', discountType: 'PERCENTAGE', discountValue: 20, dishes: [{ dishId: 'd1' }] },
    ]);

    const result = await service.get('r1');

    expect(result.dishes).toEqual([
      { id: 'd1', price: 10000, discountedPrice: '8000.00' },
      { id: 'd2', price: 5000, discountedPrice: null },
    ]);
  });

  describe('getPublic', () => {
    const livePublicRestaurant = { ...baseRestaurant, status: 'APPROVED', publishStatus: 'APPROVED' };

    it('throws NotFoundException when the restaurant does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.getPublic('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when publishStatus is not APPROVED, even if status is', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ ...livePublicRestaurant, publishStatus: 'PENDING' });

      await expect(service.getPublic('r1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when status is not APPROVED, even if publishStatus is', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ ...livePublicRestaurant, status: 'SUSPENDED' });

      await expect(service.getPublic('r1')).rejects.toThrow(NotFoundException);
    });

    it('returns real review content, a featured flag, and strips status/publishStatus from the response', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(livePublicRestaurant);
      reviews.listForRestaurant.mockResolvedValueOnce({
        items: [{ id: 'rev1', rating: 5, reviewerName: 'Ahmad', text: 'Great!' }],
        total: 1,
        page: 1,
        pageSize: 20,
      });
      featured.isFeatured.mockResolvedValueOnce(true);

      const result = await service.getPublic('r1');

      expect(reviews.listForRestaurant).toHaveBeenCalledWith('r1', 1);
      expect(featured.isFeatured).toHaveBeenCalledWith('r1');
      expect(result.reviews).toEqual([{ id: 'rev1', rating: 5, reviewerName: 'Ahmad', text: 'Great!' }]);
      expect(result.isFeatured).toBe(true);
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('publishStatus');
    });
  });
});
