import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PreviewService } from './preview.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

describe('PreviewService', () => {
  let service: PreviewService;
  let prisma: { db: { restaurant: { findUnique: jest.Mock } } };
  let events: { publicList: jest.Mock };

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

    const module = await Test.createTestingModule({
      providers: [
        PreviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: events },
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
});
