import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VerificationDocumentsService } from './verification-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

describe('VerificationDocumentsService', () => {
  let service: VerificationDocumentsService;
  let prisma: { db: { verificationDocument: Record<string, jest.Mock> } };
  let activityLog: { log: jest.Mock };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;

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

    const module = await Test.createTestingModule({
      providers: [
        VerificationDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RestaurantActivityLogService, useValue: activityLog },
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
  });

  describe('create', () => {
    it('creates a document row and logs it under the settings section', async () => {
      prisma.db.verificationDocument.create.mockResolvedValueOnce({ id: 'doc1' });

      const result = await service.create('r1', 'https://storage/doc.jpg', fakeUser);

      expect(prisma.db.verificationDocument.create).toHaveBeenCalledWith({
        data: { restaurantId: 'r1', url: 'https://storage/doc.jpg' },
      });
      expect(activityLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: 'r1', section: 'settings' }),
      );
      expect(result).toEqual({ id: 'doc1' });
    });
  });

  describe('remove', () => {
    it('refuses to remove a document belonging to a different restaurant', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({ id: 'doc1', restaurantId: 'other' });

      await expect(service.remove('r1', 'doc1', fakeUser)).rejects.toThrow(NotFoundException);
      expect(prisma.db.verificationDocument.delete).not.toHaveBeenCalled();
    });

    it('refuses to remove a document that does not exist', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('r1', 'missing', fakeUser)).rejects.toThrow(NotFoundException);
    });

    it('deletes a document this restaurant owns', async () => {
      prisma.db.verificationDocument.findUnique.mockResolvedValueOnce({ id: 'doc1', restaurantId: 'r1' });

      const result = await service.remove('r1', 'doc1', fakeUser);

      expect(prisma.db.verificationDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc1' } });
      expect(result).toEqual({ id: 'doc1' });
    });
  });
});
