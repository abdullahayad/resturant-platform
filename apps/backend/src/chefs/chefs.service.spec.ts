import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChefsService } from './chefs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChefsService', () => {
  let service: ChefsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  const baseDto = { name: 'Ahmed', photoUrl: undefined, speciality: undefined, yearsExperience: undefined, awards: undefined };

  beforeEach(async () => {
    prisma = {
      db: {
        chefProfile: {
          findMany: jest.fn(),
          upsert: jest.fn(),
        },
        dish: {
          count: jest.fn(),
        },
      },
    };

    const module = await Test.createTestingModule({
      providers: [ChefsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ChefsService);
  });

  describe('upsertProfile', () => {
    it('rejects a signature dish that does not belong to this restaurant', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(1); // only 1 of 2 requested dishes actually owned

      await expect(
        service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: ['d1', 'd2'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.chefProfile.upsert).not.toHaveBeenCalled();
    });

    it('replaces the whole signature-dish set on update, not just adds to it', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(2);
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1' });

      await service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: ['d1', 'd2'] });

      expect(prisma.db.chefProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            signatureDishes: { deleteMany: {}, create: [{ dishId: 'd1' }, { dishId: 'd2' }] },
          }),
        }),
      );
    });

    it('leaves the existing signature dishes untouched when signatureDishIds is omitted', async () => {
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1' });

      await service.upsertProfile('r1', 'HEAD_CHEF', baseDto);

      expect(prisma.db.dish.count).not.toHaveBeenCalled();
      expect(prisma.db.chefProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ signatureDishes: undefined }) }),
      );
    });

    it('clears the signature dishes when signatureDishIds is explicitly empty', async () => {
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1' });

      await service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: [] });

      expect(prisma.db.dish.count).not.toHaveBeenCalled();
      expect(prisma.db.chefProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ signatureDishes: { deleteMany: {}, create: [] } }) }),
      );
    });
  });
});
