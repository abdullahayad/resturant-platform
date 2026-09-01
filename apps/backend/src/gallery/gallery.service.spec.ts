import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GalleryService } from './gallery.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GalleryService', () => {
  let service: GalleryService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  beforeEach(async () => {
    prisma = {
      db: {
        galleryPhoto: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        dish: {
          findUnique: jest.fn(),
        },
      },
    };

    const module = await Test.createTestingModule({
      providers: [GalleryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GalleryService);
  });

  describe('create', () => {
    it('requires an ambienceSubCategory for the Ambience album', async () => {
      await expect(
        service.create('r1', { album: 'AMBIENCE', url: 'http://x/a.jpg' } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.galleryPhoto.create).not.toHaveBeenCalled();
    });

    it('rejects a dishId on a non-Food album', async () => {
      await expect(
        service.create('r1', { album: 'AMBIENCE', ambienceSubCategory: 'INDOOR', url: 'http://x/a.jpg', dishId: 'd1' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a dishId that belongs to a different restaurant', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'other' });

      await expect(
        service.create('r1', { album: 'FOOD', url: 'http://x/a.jpg', dishId: 'd1' } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.db.galleryPhoto.create).not.toHaveBeenCalled();
    });

    it('creates a Food-album photo linked to an owned dish', async () => {
      prisma.db.dish.findUnique.mockResolvedValueOnce({ restaurantId: 'r1' });
      prisma.db.galleryPhoto.create.mockResolvedValueOnce({ id: 'p1' });

      const result = await service.create('r1', { album: 'FOOD', url: 'http://x/a.jpg', dishId: 'd1' } as never);

      expect(result).toEqual({ id: 'p1' });
      expect(prisma.db.galleryPhoto.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('excludes hidden photos from a restaurant\'s own list', () => {
      service.list('r1', 'FOOD');

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

      await expect(service.remove('r1', 'p1')).rejects.toThrow(NotFoundException);
      expect(prisma.db.galleryPhoto.delete).not.toHaveBeenCalled();
    });
  });

  describe('moderate', () => {
    it('throws NotFoundException for a photo that does not exist', async () => {
      prisma.db.galleryPhoto.findUnique.mockResolvedValueOnce(null);

      await expect(service.moderate('missing', { status: 'HIDDEN' })).rejects.toThrow(NotFoundException);
    });
  });
});
