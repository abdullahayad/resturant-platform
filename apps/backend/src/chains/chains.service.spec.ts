import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChainsService } from './chains.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChainsService', () => {
  let service: ChainsService;
  let prisma: { db: { restaurantChain: Record<string, jest.Mock> } };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurantChain: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const module = await Test.createTestingModule({
      providers: [ChainsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ChainsService);
  });

  describe('create', () => {
    it('creates a chain from just the two names', async () => {
      prisma.db.restaurantChain.create.mockResolvedValueOnce({ id: 'c1' });

      await service.create({ nameEn: 'Al-Zaman', nameAr: 'الزمان' });

      expect(prisma.db.restaurantChain.create).toHaveBeenCalledWith({
        data: { nameEn: 'Al-Zaman', nameAr: 'الزمان' },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException for a chain that does not exist', async () => {
      prisma.db.restaurantChain.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('missing', { nameEn: 'X', nameAr: 'س' })).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurantChain.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a chain that does not exist', async () => {
      prisma.db.restaurantChain.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurantChain.delete).not.toHaveBeenCalled();
    });

    it('deletes the chain (restaurants are unlinked via the schema, not deleted)', async () => {
      prisma.db.restaurantChain.findUnique.mockResolvedValueOnce({ id: 'c1' });
      prisma.db.restaurantChain.delete.mockResolvedValueOnce({});

      const result = await service.remove('c1');

      expect(prisma.db.restaurantChain.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(result).toEqual({ id: 'c1' });
    });
  });
});
