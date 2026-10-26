import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MoodsService } from './moods.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MoodsService', () => {
  let service: MoodsService;
  let prisma: { db: { mood: Record<string, jest.Mock>; $transaction: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      db: {
        mood: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          aggregate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
      },
    };

    const module = await Test.createTestingModule({
      providers: [MoodsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MoodsService);
  });

  const base = { nameEn: 'Late night', nameAr: 'آخر الليل', emoji: '🌙' };

  describe('create', () => {
    it('puts a new mood at the end of the list', async () => {
      prisma.db.mood.aggregate.mockResolvedValue({ _max: { sortOrder: 23 } });
      await service.create(base);
      expect(prisma.db.mood.create).toHaveBeenCalledWith({ data: { ...base, sortOrder: 24 } });
    });

    it('rejects a season that ends before it starts', async () => {
      await expect(
        service.create({ ...base, startsAt: new Date('2027-03-10'), endsAt: new Date('2027-02-10') }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.mood.create).not.toHaveBeenCalled();
    });
  });

  describe('listActive', () => {
    it('only returns switched-on moods in season', async () => {
      const now = new Date('2027-03-01');
      await service.listActive(now);
      expect(prisma.db.mood.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
        }),
      );
    });
  });

  describe('reorder', () => {
    it('numbers moods in the order given', async () => {
      await service.reorder(['b', 'a']);
      expect(prisma.db.mood.update).toHaveBeenNthCalledWith(1, { where: { id: 'b' }, data: { sortOrder: 1 } });
      expect(prisma.db.mood.update).toHaveBeenNthCalledWith(2, { where: { id: 'a' }, data: { sortOrder: 2 } });
    });
  });

  describe('remove', () => {
    it('throws when the mood does not exist', async () => {
      prisma.db.mood.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.db.mood.delete).not.toHaveBeenCalled();
    });
  });
});
