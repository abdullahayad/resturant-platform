import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };
  let activityLog: { log: jest.Mock };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;

  beforeEach(async () => {
    prisma = {
      db: {
        promotion: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        promotionTemplate: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
        dish: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    };
    activityLog = { log: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: activityLog },
      ],
    }).compile();

    service = module.get(PromotionsService);
  });

  describe('create', () => {
    it('goes live immediately (status APPROVED) instead of waiting on admin review', async () => {
      prisma.db.promotion.create.mockResolvedValueOnce({});

      await service.create(
        'r1',
        {
          titleEn: 'Sale',
          titleAr: 'تخفيض',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          scope: 'WHOLE_MENU',
          isRecurring: false,
          validFrom: '2026-09-01',
          validUntil: '2026-09-30',
        },
        fakeUser,
      );

      expect(prisma.db.promotion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });
  });

  describe('update', () => {
    it('does not touch status when editing a promotion, unlike the old approval-reset behavior', async () => {
      prisma.db.promotion.findUnique.mockResolvedValueOnce({
        restaurantId: 'r1',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        scope: 'WHOLE_MENU',
      });
      prisma.db.promotion.update.mockResolvedValueOnce({
        titleEn: 'New title',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        isActive: true,
      });

      await service.update('r1', 'p1', { titleEn: 'New title' }, fakeUser);

      const data = prisma.db.promotion.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('rejectionReason');
    });
  });

  describe('activePromotionsNow', () => {
    it('only asks for promotions that are active and not rejected, then filters by schedule', async () => {
      const now = new Date();
      prisma.db.promotion.findMany.mockResolvedValueOnce([
        {
          scope: 'WHOLE_MENU',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          isRecurring: false,
          validFrom: new Date(now.getTime() - 86_400_000),
          validUntil: new Date(now.getTime() + 86_400_000),
          recurringDayOfWeek: null,
          startTime: null,
          endTime: null,
          dishes: [],
        },
        {
          scope: 'WHOLE_MENU',
          discountType: 'FIXED_AMOUNT',
          discountValue: 500,
          isRecurring: false,
          validFrom: new Date(now.getTime() - 172_800_000),
          validUntil: new Date(now.getTime() - 86_400_000), // already ended
          recurringDayOfWeek: null,
          startTime: null,
          endTime: null,
          dishes: [],
        },
      ]);

      const result = await service.activePromotionsNow('r1');

      expect(prisma.db.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', isActive: true, status: { not: 'REJECTED' } } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].discountValue).toBe(10);
    });
  });

  describe('summary', () => {
    it('reports counts broken down by status, discount type, and a date-aware active-now', async () => {
      prisma.db.promotion.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(6) // approved
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(7) // percentage
        .mockResolvedValueOnce(3); // fixed amount
      // Of the APPROVED+isActive candidates, only ones actually live right
      // now (by date) should count - a future-dated one must not.
      prisma.db.promotion.findMany.mockResolvedValueOnce([
        { isRecurring: false, validFrom: new Date(Date.now() - 86_400_000), validUntil: new Date(Date.now() + 86_400_000), recurringDayOfWeek: null, startTime: null, endTime: null },
        { isRecurring: false, validFrom: new Date(Date.now() + 86_400_000), validUntil: new Date(Date.now() + 172_800_000), recurringDayOfWeek: null, startTime: null, endTime: null }, // future-dated
      ]);

      const result = await service.summary('r1');

      expect(result).toEqual({
        total: 10,
        byStatus: { PENDING: 2, APPROVED: 6, REJECTED: 2 },
        activeNow: 1,
        byDiscountType: { PERCENTAGE: 7, FIXED_AMOUNT: 3 },
      });
      expect(prisma.db.promotion.count).toHaveBeenCalledWith({ where: { restaurantId: 'r1' } });
      expect(prisma.db.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', status: 'APPROVED', isActive: true } }),
      );
    });

    it('reports all zeros for a restaurant with no promotions yet', async () => {
      const result = await service.summary('r1');

      expect(result).toEqual({
        total: 0,
        byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
        activeNow: 0,
        byDiscountType: { PERCENTAGE: 0, FIXED_AMOUNT: 0 },
      });
    });
  });

  describe('createTemplate', () => {
    it('saves a recurring template with no date range', async () => {
      prisma.db.promotionTemplate.create.mockResolvedValueOnce({ id: 't1' });

      await service.createTemplate('r1', {
        name: 'Happy Hour',
        titleEn: 'Happy Hour',
        titleAr: 'ساعة سعيدة',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        scope: 'WHOLE_MENU',
        isRecurring: true,
        recurringDayOfWeek: 5,
        startTime: '17:00',
        endTime: '19:00',
      });

      expect(prisma.db.promotionTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ restaurantId: 'r1', name: 'Happy Hour', recurringDayOfWeek: 5 }),
        }),
      );
    });

    it('rejects a SPECIFIC_DISHES template whose dishes do not belong to this restaurant', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(1); // only 1 of 2 actually owned

      await expect(
        service.createTemplate('r1', {
          name: 'Dish Deal',
          titleEn: 'Dish Deal',
          titleAr: 'عرض',
          discountType: 'FIXED_AMOUNT',
          discountValue: 1000,
          scope: 'SPECIFIC_DISHES',
          dishIds: ['d1', 'd2'],
          isRecurring: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.promotionTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('removeTemplate', () => {
    it('refuses to remove a template belonging to a different restaurant', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({ id: 't1', restaurantId: 'other' });

      await expect(service.removeTemplate('r1', 't1')).rejects.toThrow(NotFoundException);
      expect(prisma.db.promotionTemplate.delete).not.toHaveBeenCalled();
    });

    it('deletes a template this restaurant owns', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({ id: 't1', restaurantId: 'r1' });

      const result = await service.removeTemplate('r1', 't1');

      expect(prisma.db.promotionTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(result).toEqual({ id: 't1' });
    });
  });

  describe('applyTemplate', () => {
    const baseTemplate = {
      id: 't1',
      restaurantId: 'r1',
      titleEn: 'Happy Hour',
      titleAr: 'ساعة سعيدة',
      descriptionEn: null,
      descriptionAr: null,
      photoUrl: null,
      discountType: 'PERCENTAGE',
      discountValue: 20,
      scope: 'WHOLE_MENU',
      dishIds: [],
      isRecurring: true,
      recurringDayOfWeek: 5,
      startTime: '17:00',
      endTime: '19:00',
    };

    it('refuses to apply a template belonging to a different restaurant', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({ ...baseTemplate, restaurantId: 'other' });

      await expect(service.applyTemplate('r1', 't1', {}, fakeUser)).rejects.toThrow(NotFoundException);
    });

    it('requires validFrom/validUntil to apply a non-recurring template', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({ ...baseTemplate, isRecurring: false, validFrom: null });

      await expect(service.applyTemplate('r1', 't1', {}, fakeUser)).rejects.toThrow(BadRequestException);
    });

    it('creates a real promotion from a recurring template, no dates needed', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce(baseTemplate);
      prisma.db.promotion.create.mockResolvedValueOnce({ id: 'p1', titleEn: 'Happy Hour' });

      await service.applyTemplate('r1', 't1', {}, fakeUser);

      expect(prisma.db.promotion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ titleEn: 'Happy Hour', isRecurring: true, recurringDayOfWeek: 5, status: 'APPROVED' }),
        }),
      );
    });

    it('silently drops dish ids that no longer belong to the restaurant instead of erroring', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({
        ...baseTemplate,
        scope: 'SPECIFIC_DISHES',
        dishIds: ['d1', 'd2', 'd3'],
      });
      // Only d1 and d3 still exist / belong to this restaurant - d2 was deleted since.
      prisma.db.dish.findMany.mockResolvedValueOnce([{ id: 'd1' }, { id: 'd3' }]);
      // create()'s own assertDishesBelongToRestaurant re-checks ownership of
      // whatever dishIds it's handed - both of the filtered-down ids do
      // belong here, so this should resolve 2, not the default-mocked 0.
      prisma.db.dish.count.mockResolvedValueOnce(2);
      prisma.db.promotion.create.mockResolvedValueOnce({ id: 'p1' });

      await service.applyTemplate('r1', 't1', {}, fakeUser);

      expect(prisma.db.promotion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dishes: { create: [{ dishId: 'd1' }, { dishId: 'd3' }] },
          }),
        }),
      );
    });

    it('refuses to apply a SPECIFIC_DISHES template whose every dish has since been deleted', async () => {
      prisma.db.promotionTemplate.findUnique.mockResolvedValueOnce({
        ...baseTemplate,
        scope: 'SPECIFIC_DISHES',
        dishIds: ['d1'],
      });
      prisma.db.dish.findMany.mockResolvedValueOnce([]); // none left

      await expect(service.applyTemplate('r1', 't1', {}, fakeUser)).rejects.toThrow(BadRequestException);
      expect(prisma.db.promotion.create).not.toHaveBeenCalled();
    });
  });
});
