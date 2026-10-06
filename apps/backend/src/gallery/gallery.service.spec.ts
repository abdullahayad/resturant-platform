import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GalleryService } from './gallery.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('GalleryService', () => {
  let service: GalleryService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed-shape mock (nested model mocks plus a bare $transaction mock)
  let prisma: any;
  let activityLog: { log: jest.Mock };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;

  beforeEach(async () => {
    prisma = {
      db: {
        galleryPhoto: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          delete: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
        dish: {
          findUnique: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };
    // $transaction just runs the callback with a tx that reuses the same mocks.
    prisma.db.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma.db));
    activityLog = { log: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: activityLog },
      ],
    }).compile();

    service = module.get(GalleryService);
  });

  describe('create', () => {
    it('requires an ambienceSubCategory for the Ambience album', async () => {
      await expect(
        service.create('r1', { album: 'AMBIENCE', url: 'http://x/a.jpg' } as never, fakeUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.galleryPhoto.create).not.toHaveBeenCalled();
    });

    it('rejects a dishId on a non-Food album', async () => {
      await expect(
        service.create('r1', { album: 'AMBIENCE', ambienceSubCategory: 'INDOOR', url: 'http://x/a.jpg', dishId: 'd1' } as never, fakeUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a dishId that belongs to a different restaurant', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'other' });

      await expect(
        service.create('r1', { album: 'FOOD', url: 'http://x/a.jpg', dishId: 'd1' } as never, fakeUser),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.db.galleryPhoto.create).not.toHaveBeenCalled();
    });

    it('creates a Food-album photo linked to an owned dish', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'r1' });
      prisma.db.galleryPhoto.create.mockResolvedValueOnce({ id: 'p1' });

      const result = await service.create('r1', { album: 'FOOD', url: 'http://x/a.jpg', dishId: 'd1' } as never, fakeUser);

      expect(result).toEqual({ id: 'p1' });
      expect(prisma.db.galleryPhoto.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('excludes hidden photos from a restaurant\'s own list', async () => {
      await service.list('r1', 'FOOD');

      expect(prisma.db.galleryPhoto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'r1', album: 'FOOD', moderationStatus: { not: 'HIDDEN' } },
        }),
      );
    });
  });

  describe('remove', () => {
    it('refuses to remove a photo belonging to a different restaurant', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce({ restaurantId: 'other' });

      await expect(service.remove('r1', 'p1', fakeUser)).rejects.toThrow(NotFoundException);
      expect(prisma.db.galleryPhoto.delete).not.toHaveBeenCalled();
    });
  });

  describe('moderate', () => {
    it('throws NotFoundException for a photo that does not exist', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce(null);

      await expect(service.moderate('missing', { status: 'HIDDEN' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCover', () => {
    it('refuses to set a cover on a photo belonging to a different restaurant', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce({ restaurantId: 'other', album: 'FOOD' });

      await expect(service.setCover('r1', 'p1', true, fakeUser)).rejects.toThrow(NotFoundException);
      expect(prisma.db.galleryPhoto.updateMany).not.toHaveBeenCalled();
    });

    it('clears any other cover in the same album before setting the new one', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce({ restaurantId: 'r1', album: 'FOOD' });
      prisma.db.galleryPhoto.update.mockResolvedValueOnce({ id: 'p1', isCover: true });

      await service.setCover('r1', 'p1', true, fakeUser);

      expect(prisma.db.galleryPhoto.updateMany).toHaveBeenCalledWith({
        where: { restaurantId: 'r1', album: 'FOOD', isCover: true },
        data: { isCover: false },
      });
      expect(prisma.db.galleryPhoto.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { isCover: true } }),
      );
    });

    it('unsetting a cover does not touch any other photo', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce({ restaurantId: 'r1', album: 'FOOD' });
      prisma.db.galleryPhoto.update.mockResolvedValueOnce({ id: 'p1', isCover: false });

      await service.setCover('r1', 'p1', false, fakeUser);

      expect(prisma.db.galleryPhoto.updateMany).not.toHaveBeenCalled();
      expect(prisma.db.galleryPhoto.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { isCover: false } }),
      );
    });
  });
});
