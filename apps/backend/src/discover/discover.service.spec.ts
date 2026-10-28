import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DiscoverService } from './discover.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DiscoverService', () => {
  let service: DiscoverService;
  let prisma: {
    db: {
      restaurant: { findMany: jest.Mock };
      mood: { findFirst: jest.Mock };
      openingHours: { findMany: jest.Mock };
      promotion: { findMany: jest.Mock };
      dish: { groupBy: jest.Mock };
      featuredPlacement: { findMany: jest.Mock };
      $queryRaw: jest.Mock;
    };
  };

  const now = new Date('2026-10-28T09:30:00Z'); // Wednesday 12:30 in Baghdad

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findMany: jest.fn().mockResolvedValue([]) },
        mood: { findFirst: jest.fn() },
        openingHours: { findMany: jest.fn().mockResolvedValue([]) },
        promotion: { findMany: jest.fn().mockResolvedValue([]) },
        dish: { groupBy: jest.fn().mockResolvedValue([]) },
        featuredPlacement: { findMany: jest.fn().mockResolvedValue([]) },
        $queryRaw: jest.fn().mockResolvedValue([]),
      },
    };
    const module = await Test.createTestingModule({
      providers: [DiscoverService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DiscoverService);
  });

  const firstWhere = () => {
    const [args] = prisma.db.restaurant.findMany.mock.calls[0] as [{ where: { AND: object[] } }];
    return args.where.AND;
  };

  it('only ever searches live (approved and published) restaurants', async () => {
    await service.search({}, now);
    expect(firstWhere()).toContainEqual({ status: 'APPROVED', publishStatus: 'APPROVED' });
  });

  it('needs every ticked facility, but any one of the ticked cuisines', async () => {
    await service.search({ facilityIds: ['f1', 'f2'], foodCategoryIds: ['c1', 'c2'] }, now);
    expect(firstWhere()).toEqual(
      expect.arrayContaining([
        { facilities: { some: { facilityId: 'f1' } } },
        { facilities: { some: { facilityId: 'f2' } } },
        { foodCategories: { some: { foodCategoryId: { in: ['c1', 'c2'] } } } },
      ]),
    );
  });

  it("applies a mood's rules together", async () => {
    prisma.db.mood.findFirst.mockResolvedValueOnce({
      healthyOnly: false,
      openAfterMidnight: false,
      businessTypeIds: [],
      foodCategoryIds: ['grill'],
      facilityIds: ['river', 'rooftop'],
      eventTypeIds: [],
      classes: ['LUXURY'],
    });
    await service.search({ moodId: 'm1' }, now);
    expect(firstWhere()).toEqual(
      expect.arrayContaining([
        { foodCategories: { some: { foodCategoryId: { in: ['grill'] } } } },
        { facilities: { some: { facilityId: { in: ['river', 'rooftop'] } } } },
        { class: { in: ['LUXURY'] } },
      ]),
    );
  });

  it('returns nothing for a switched-off mood, or a Healthy mood before the Healthy tag exists', async () => {
    prisma.db.mood.findFirst.mockResolvedValueOnce(null);
    await expect(service.search({ moodId: 'off' }, now)).resolves.toMatchObject({ items: [], total: 0 });

    prisma.db.mood.findFirst.mockResolvedValueOnce({ healthyOnly: true });
    await expect(service.search({ moodId: 'healthy' }, now)).resolves.toMatchObject({ items: [], total: 0 });

    expect(prisma.db.restaurant.findMany).not.toHaveBeenCalled();
  });

  it('keeps only restaurants open right now in Baghdad when openNow is set', async () => {
    prisma.db.restaurant.findMany.mockResolvedValueOnce([{ id: 'open' }, { id: 'closed' }]);
    prisma.db.openingHours.findMany.mockResolvedValueOnce([
      { restaurantId: 'open', dayOfWeek: 3, isClosed: false, openTime: '09:00', closeTime: '23:00' },
      { restaurantId: 'closed', dayOfWeek: 3, isClosed: false, openTime: '18:00', closeTime: '23:00' },
    ]);
    prisma.db.$queryRaw.mockResolvedValueOnce([]);

    const result = await service.search({ openNow: true }, now);

    expect(result.total).toBe(1);
  });

  it('rejects location queries without both coordinates', async () => {
    await expect(service.search({ sort: 'nearest' }, now)).rejects.toThrow(BadRequestException);
    await expect(service.search({ lat: 33.3 }, now)).rejects.toThrow(BadRequestException);
    await expect(service.search({ radiusKm: 5 }, now)).rejects.toThrow(BadRequestException);
  });

  it('builds cards with rounded numbers and the live-offer flag', async () => {
    prisma.db.restaurant.findMany.mockResolvedValueOnce([{ id: 'r1' }]).mockResolvedValueOnce([
      {
        id: 'r1',
        nameEn: 'Grill',
        nameAr: 'مشويات',
        logoUrl: null,
        class: null,
        isVerified: true,
        latitude: '33.315200',
        longitude: '44.366100',
        province: null,
        district: null,
        chain: null,
        businessTypes: [],
        foodCategories: [{ foodCategory: { id: 'c1', nameEn: 'Grill', nameAr: 'مشاوي' } }],
        openingHours: [],
        galleryPhotos: [{ url: 'https://cdn/cover.jpg' }],
      },
    ]);
    prisma.db.$queryRaw.mockResolvedValueOnce([
      { id: 'r1', isFeatured: true, rating: 4.4444, reviewCount: 9, distanceMeters: 1234 },
    ]);
    prisma.db.dish.groupBy.mockResolvedValueOnce([{ restaurantId: 'r1', _min: { price: '4500.00' } }]);
    prisma.db.promotion.findMany.mockResolvedValueOnce([
      {
        restaurantId: 'r1',
        isRecurring: false,
        validFrom: new Date('2026-10-01'),
        validUntil: new Date('2026-11-01'),
        recurringDayOfWeek: null,
        startTime: null,
        endTime: null,
      },
    ]);

    const { items } = await service.search({ lat: 33.31, lng: 44.36 }, now);

    expect(items[0]).toMatchObject({
      rating: 4.4,
      reviewCount: 9,
      distanceKm: 1.2,
      priceFrom: 4500,
      hasOffer: true,
      isFeatured: true,
      isOpenNow: null,
      latitude: 33.3152,
      coverPhotoUrl: 'https://cdn/cover.jpg',
      foodCategories: [{ id: 'c1', nameEn: 'Grill', nameAr: 'مشاوي' }],
    });
  });
});
