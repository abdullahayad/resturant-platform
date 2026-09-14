import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DishesService } from './dishes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DishesService', () => {
  let service: DishesService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  beforeEach(async () => {
    prisma = {
      db: {
        dish: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
      },
    };

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
});
