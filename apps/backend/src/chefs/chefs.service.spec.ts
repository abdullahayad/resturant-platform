import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChefsService } from './chefs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('ChefsService', () => {
  let service: ChefsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };
  let activityLog: { log: jest.Mock };

  const baseDto = {
    name: 'Ahmed',
    photoUrl: undefined,
    speciality: undefined,
    yearsExperience: undefined,
    awards: undefined,
  };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;

  beforeEach(async () => {
    prisma = {
      db: {
        chefProfile: {
          findMany: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn(),
        },
        dish: {
          count: jest.fn(),
        },
        restaurant: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };
    activityLog = { log: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ChefsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: activityLog },
      ],
    }).compile();

    service = module.get(ChefsService);
  });

  describe('upsertProfile', () => {
    it('rejects a signature dish that does not belong to this restaurant', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(1); // only 1 of 2 requested dishes actually owned

      await expect(
        service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: ['d1', 'd2'] }, fakeUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.chefProfile.upsert).not.toHaveBeenCalled();
    });

    it('replaces the whole signature-dish set on update, not just adds to it', async () => {
      prisma.db.dish.count.mockResolvedValueOnce(2);
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1' });

      await service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: ['d1', 'd2'] }, fakeUser);

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

      await service.upsertProfile('r1', 'HEAD_CHEF', baseDto, fakeUser);

      expect(prisma.db.dish.count).not.toHaveBeenCalled();
      expect(prisma.db.chefProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ signatureDishes: undefined }) }),
      );
    });

    it('clears the signature dishes when signatureDishIds is explicitly empty', async () => {
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1' });

      await service.upsertProfile('r1', 'HEAD_CHEF', { ...baseDto, signatureDishIds: [] }, fakeUser);

      expect(prisma.db.dish.count).not.toHaveBeenCalled();
      expect(prisma.db.chefProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ signatureDishes: { deleteMany: {}, create: [] } }),
        }),
      );
    });

    it('logs an activity entry', async () => {
      prisma.db.chefProfile.upsert.mockResolvedValueOnce({ id: 'chef1', name: 'Ahmed' });

      await service.upsertProfile('r1', 'HEAD_CHEF', baseDto, fakeUser);

      expect(activityLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: 'r1', section: 'chefManagement' }),
      );
    });
  });
});
