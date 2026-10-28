import { Test } from '@nestjs/testing';
import { DiscoverListsService } from './discover-lists.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DiscoverListsService', () => {
  let service: DiscoverListsService;
  let prisma: {
    db: {
      promotion: { findMany: jest.Mock };
      dish: { findMany: jest.Mock; count: jest.Mock };
      restaurantEvent: { findMany: jest.Mock };
    };
  };

  // Wednesday 2026-10-28, 12:30 in Baghdad.
  const now = new Date('2026-10-28T09:30:00Z');
  const restaurant = { id: 'r1', nameEn: 'Noon', nameAr: 'نون', logoUrl: null, district: null, galleryPhotos: [] };

  beforeEach(async () => {
    prisma = {
      db: {
        promotion: { findMany: jest.fn().mockResolvedValue([]) },
        dish: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
        restaurantEvent: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const module = await Test.createTestingModule({
      providers: [DiscoverListsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DiscoverListsService);
  });

  const event = (overrides: object) => ({
    id: 'e1',
    titleEn: 'Live music',
    titleAr: 'موسيقى',
    descriptionEn: null,
    descriptionAr: null,
    photoUrl: null,
    price: null,
    capacity: null,
    isRecurring: true,
    eventDate: null,
    recurringDaysOfWeek: [],
    recurringTime: null,
    eventType: { id: 't1', nameEn: 'Music', nameAr: 'موسيقى', icon: null },
    restaurant,
    ...overrides,
  });

  describe('events', () => {
    it('puts a recurring event on its next day, skipping today once it has started', async () => {
      prisma.db.restaurantEvent.findMany.mockResolvedValueOnce([
        event({ id: 'later-today', recurringDaysOfWeek: [3], recurringTime: '20:00' }),
        event({ id: 'started', recurringDaysOfWeek: [3], recurringTime: '09:00' }),
        event({ id: 'friday', recurringDaysOfWeek: [5], recurringTime: '19:00' }),
      ]);

      const { items } = await service.events({}, now);

      expect(items.map((e) => [e.id, e.date, e.time])).toEqual([
        ['later-today', '2026-10-28', '20:00'],
        ['friday', '2026-10-30', '19:00'],
        ['started', '2026-11-04', '09:00'],
      ]);
      expect(items[0].bookingDate).toBe('2026-10-28');
    });

    it('shows a one-off event on its Baghdad date and time, booked by its own timestamp', async () => {
      // 22:00 UTC on the 29th is 01:00 on the 30th in Baghdad.
      const eventDate = new Date('2026-10-29T22:00:00Z');
      prisma.db.restaurantEvent.findMany.mockResolvedValueOnce([event({ isRecurring: false, eventDate })]);

      const { items } = await service.events({}, now);

      expect(items[0]).toMatchObject({ date: '2026-10-30', time: '01:00', bookingDate: eventDate.toISOString() });
    });

    it('keeps only what happens on the chosen day', async () => {
      prisma.db.restaurantEvent.findMany.mockResolvedValueOnce([
        event({ id: 'fri', recurringDaysOfWeek: [5] }),
        event({ id: 'sat', recurringDaysOfWeek: [6] }),
        event({ id: 'one-off', isRecurring: false, eventDate: new Date('2026-10-30T16:00:00Z') }),
      ]);

      const { items } = await service.events({ date: '2026-10-30' }, now);

      expect(items.map((e) => e.id).sort()).toEqual(['fri', 'one-off']);
    });
  });

  describe('offers', () => {
    it('lists offers running now first and drops dish offers with no visible dishes left', async () => {
      const base = {
        titleEn: 'x',
        titleAr: 'x',
        descriptionEn: null,
        descriptionAr: null,
        photoUrl: null,
        discountType: 'PERCENTAGE',
        discountValue: '20',
        validFrom: null,
        validUntil: null,
        startTime: null,
        endTime: null,
        restaurant,
      };
      prisma.db.promotion.findMany.mockResolvedValueOnce([
        { ...base, id: 'friday', scope: 'WHOLE_MENU', isRecurring: true, recurringDayOfWeek: 5, dishes: [] },
        { ...base, id: 'empty', scope: 'SPECIFIC_DISHES', isRecurring: true, recurringDayOfWeek: 3, dishes: [] },
        { ...base, id: 'today', scope: 'WHOLE_MENU', isRecurring: true, recurringDayOfWeek: 3, dishes: [] },
      ]);

      const { items } = await service.offers(1, now);

      expect(items.map((o) => [o.id, o.liveNow])).toEqual([
        ['today', true],
        ['friday', false],
      ]);
      expect(items[0].discountValue).toBe(20);
    });
  });

  describe('budgetDishes', () => {
    it("applies today's discount to the listed price", async () => {
      prisma.db.dish.findMany.mockResolvedValueOnce([
        { id: 'd1', nameEn: 'Falafel', nameAr: 'فلافل', price: '4000', photoUrl: null, menuCategory: null, restaurant },
      ]);
      prisma.db.dish.count.mockResolvedValueOnce(1);
      prisma.db.promotion.findMany.mockResolvedValueOnce([
        {
          restaurantId: 'r1',
          scope: 'WHOLE_MENU',
          discountType: 'PERCENTAGE',
          discountValue: '25',
          isRecurring: true,
          validFrom: null,
          validUntil: null,
          recurringDayOfWeek: 3,
          startTime: null,
          endTime: null,
          dishes: [],
        },
      ]);

      const result = await service.budgetDishes(5000, 1, now);

      expect(result.items[0]).toMatchObject({ price: 4000, discountedPrice: 3000, restaurant: { id: 'r1' } });
      expect(result.total).toBe(1);
    });
  });
});
