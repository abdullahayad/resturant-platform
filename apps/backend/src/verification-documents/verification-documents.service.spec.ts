import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VerificationDocumentsService } from './verification-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import { StorageService } from '../uploads/storage.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('VerificationDocumentsService', () => {
  let service: VerificationDocumentsService;
  let prisma: { db: { verificationDocument: Record<string, jest.Mock> } };
  let activityLog: { log: jest.Mock };
  let storage: { uploadPrivate: jest.Mock; signedUrl: jest.Mock; deletePrivate: jest.Mock };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;
  const file = { buffer: Buffer.from('x'), originalname: 'license.jpg' };
  const createdAt = new Date('2026-10-08T00:00:00Z');

  beforeEach(async () => {
    prisma = {
      db: {
        verificationDocument: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          findUnique: jest.fn(),
          delete: jest.fn(),
        },
      },
    };
    activityLog = { log: jest.fn() };
    storage = {
      uploadPrivate: jest.fn().mockResolvedValue({ key: 'verification-documents/r1/abc.jpg' }),
      signedUrl: jest.fn().mockResolvedValue('https://signed/abc.jpg'),
      deletePrivate: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        VerificationDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: activityLog },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(VerificationDocumentsService);
  });

  describe('list', () => {
    it('scopes to the given restaurant, newest first', async () => {
      await service.list('r1');

      expect(prisma.db.verificationDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1' }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('signs private documents and passes legacy public URLs through', async () => {
      prisma.db.verificationDocument.findMany.mockResolvedValueOnce([
        { id: 'new', storageKey: 'verification-documents/r1/abc.jpg', url: null, createdAt },
        { id: 'old', storageKey: null, url: 'https://public/old.jpg', createdAt },
      ]);

      const result = await service.list('r1');

      expect(storage.signedUrl).toHaveBeenCalledWith('verification-documents/r1/abc.jpg');
      expect(result).toEqual([
        { id: 'new', url: 'https://signed/abc.jpg', createdAt },
        { id: 'old', url: 'https://public/old.jpg', createdAt },
      ]);
    });
  });

  describe('create', () => {
    it("uploads to the private bucket under the restaurant's folder and stores only the key", async () => {
      prisma.db.verificationDocument.create.mockResolvedValueOnce({
        id: 'doc1',
        storageKey: 'verification-documents/r1/abc.jpg',
        url: null,
        createdAt,
      });

      const result = await service.create('r1', file, fakeUser);

      expect(storage.uploadPrivate).toHaveBeenCalledWith(file, 'verification-documents/r1');
      expect(prisma.db.verificationDocument.create).toHaveBeenCalledWith({
        data: { restaurantId: 'r1', storageKey: 'verification-documents/r1/abc.jpg' },
      });
      expect(activityLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: 'r1', section: 'settings' }),
      );
      expect(result).toEqual({ id: 'doc1', url: 'https://signed/abc.jpg', createdAt });
    });
  });

  describe('viewUrl', () => {
    it('signs a fresh URL for a document of this restaurant', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({
        id: 'doc1',
        restaurantId: 'r1',
        storageKey: 'verification-documents/r1/abc.jpg',
        url: null,
        createdAt,
      });

      await expect(service.viewUrl('r1', 'doc1')).resolves.toBe('https://signed/abc.jpg');
      expect(storage.signedUrl).toHaveBeenCalledWith('verification-documents/r1/abc.jpg');
    });

    it("refuses another restaurant's document", async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({
        id: 'doc1',
        restaurantId: 'other',
        storageKey: 'verification-documents/other/abc.jpg',
        url: null,
        createdAt,
      });

      await expect(service.viewUrl('r1', 'doc1')).rejects.toThrow(NotFoundException);
      expect(storage.signedUrl).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('refuses to remove a document belonging to a different restaurant', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({ id: 'doc1', restaurantId: 'other' });

      await expect(service.remove('r1', 'doc1', fakeUser)).rejects.toThrow(NotFoundException);
      expect(prisma.db.verificationDocument.delete).not.toHaveBeenCalled();
      expect(storage.deletePrivate).not.toHaveBeenCalled();
    });

    it('refuses to remove a document that does not exist', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('r1', 'missing', fakeUser)).rejects.toThrow(NotFoundException);
    });

    it('deletes the row and the stored file', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({
        id: 'doc1',
        restaurantId: 'r1',
        storageKey: 'verification-documents/r1/abc.jpg',
      });

      const result = await service.remove('r1', 'doc1', fakeUser);

      expect(prisma.db.verificationDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc1' } });
      expect(storage.deletePrivate).toHaveBeenCalledWith('verification-documents/r1/abc.jpg');
      expect(result).toEqual({ id: 'doc1' });
    });

    it('still succeeds if deleting the stored file fails', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({
        id: 'doc1',
        restaurantId: 'r1',
        storageKey: 'verification-documents/r1/abc.jpg',
      });
      storage.deletePrivate.mockRejectedValueOnce(new Error('storage down'));

      await expect(service.remove('r1', 'doc1', fakeUser)).resolves.toEqual({ id: 'doc1' });
    });

    it('leaves legacy public-URL rows to the row delete alone', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({
        id: 'doc1',
        restaurantId: 'r1',
        storageKey: null,
        url: 'https://public/old.jpg',
      });

      await service.remove('r1', 'doc1', fakeUser);

      expect(storage.deletePrivate).not.toHaveBeenCalled();
    });
  });
});
