import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DishesService } from './dishes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DishesService', () => {
  let service: DishesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed-shape mock (nested model mocks plus a bare $transaction mock)
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      db: {
        dish: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn(),
      },
    };
    // $transaction just runs the callback with a tx that reuses the same mocks.
    prisma.db.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma.db));

    const module = await Test.createTestingModule({
      providers: [DishesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DishesService);
  });

  describe('list', () => {
    it('excludes hidden and inactive dishes from a restaurant\'s own list', () => {
      service.list('r1');

      expect(prisma.db.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'r1', isActive: true, moderationStatus: { not: 'HIDDEN' } },
        }),
      );
    });
  });

  describe('remove', () => {
    it('refuses to remove a dish belonging to a different restaurant', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'other' });

      await expect(service.remove('r1', 'dish1')).rejects.toThrow(NotFoundException);
      expect(prisma.db.dish.update).not.toHaveBeenCalled();
    });

    it('soft-deletes (isActive: false) a dish the restaurant owns', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'r1' });
      prisma.db.dish.update.mockResolvedValueOnce({});

      await service.remove('r1', 'dish1');

      expect(prisma.db.dish.update).toHaveBeenCalledWith({ where: { id: 'dish1' }, data: { isActive: false } });
    });
  });

  describe('adminList', () => {
    it('passes the requested moderation status through to the query', async () => {
      await service.adminList('FLAGGED');

      expect(prisma.db.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true, moderationStatus: 'FLAGGED' } }),
      );
    });

    it('omits the moderation-status filter (returns all statuses) when none is given', async () => {
      await service.adminList();

      expect(prisma.db.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true, moderationStatus: undefined } }),
      );
    });
  });

  describe('moderate', () => {
    it('throws NotFoundException for a dish that does not exist', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce(null);

      await expect(service.moderate('missing', { status: 'HIDDEN' })).rejects.toThrow(NotFoundException);
      expect(prisma.db.dish.update).not.toHaveBeenCalled();
    });

    it('updates the moderation status of an existing dish', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ id: 'dish1' });
      prisma.db.dish.update.mockResolvedValueOnce({ id: 'dish1', moderationStatus: 'VISIBLE' });

      await service.moderate('dish1', { status: 'VISIBLE' });

      expect(prisma.db.dish.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dish1' }, data: { moderationStatus: 'VISIBLE' } }),
      );
    });
  });

  describe('bulkUpdatePrices', () => {
    it('raises every active dish by a percentage, rounded to 2 decimals', async () => {
      prisma.db.dish.findMany.mockResolvedValueOnce([
        { id: 'd1', price: 1000 },
        { id: 'd2', price: 2500 },
      ]);
      prisma.db.dish.update.mockImplementation(({ where, data }: { where: { id: string }; data: { price: number } }) =>
        Promise.resolve({ id: where.id, price: data.price }),
      );

      const result = await service.bulkUpdatePrices('r1', { type: 'PERCENTAGE', value: 10 });

      expect(prisma.db.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', isActive: true } }),
      );
      expect(result).toEqual([
        { id: 'd1', price: 1100 },
        { id: 'd2', price: 2750 },
      ]);
    });

    it('lowers price by a fixed amount but never below 1', async () => {
      prisma.db.dish.findMany.mockResolvedValueOnce([{ id: 'd1', price: 500 }]);
      prisma.db.dish.update.mockImplementation(({ where, data }: { where: { id: string }; data: { price: number } }) =>
        Promise.resolve({ id: where.id, price: data.price }),
      );

      const result = await service.bulkUpdatePrices('r1', { type: 'FIXED_AMOUNT', value: -10000 });

      expect(result).toEqual([{ id: 'd1', price: 1 }]);
    });

    it('restricts the update to the given dish ids once ownership is verified', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(2);
      prisma.db.dish.findMany.mockResolvedValueOnce([
        { id: 'd1', price: 1000 },
        { id: 'd2', price: 2000 },
      ]);
      prisma.db.dish.update.mockResolvedValue({});

      await service.bulkUpdatePrices('r1', { type: 'FIXED_AMOUNT', value: 100, dishIds: ['d1', 'd2'] });

      expect(prisma.db.dish.count).toHaveBeenCalledWith({ where: { id: { in: ['d1', 'd2'] }, restaurantId: 'r1' } });
      expect(prisma.db.dish.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['d1', 'd2'] }, restaurantId: 'r1' } }),
      );
    });

    it('refuses the update when a selected dish id does not belong to this restaurant', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(1); // only 1 of 2 requested ids actually belongs to r1

      await expect(
        service.bulkUpdatePrices('r1', { type: 'FIXED_AMOUNT', value: 100, dishIds: ['d1', 'd2'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.dish.findMany).not.toHaveBeenCalled();
    });
  });
});
