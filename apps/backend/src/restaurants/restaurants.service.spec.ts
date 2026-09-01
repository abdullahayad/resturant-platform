import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import type { RegisterRestaurantDto } from './dto/register-restaurant.dto';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };

  const baseRegisterDto: RegisterRestaurantDto = {
    nameEn: 'Test Restaurant',
    nameAr: 'مطعم تجريبي',
    phone: '07700000000',
    ownerEmail: 'owner@test.iq',
    ownerPassword: 'password123',
    businessTypeIds: [],
    foodCategoryIds: [],
    agreedToTerms: true,
  };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('token') } },
        { provide: EmailService, useValue: { send: jest.fn() } },
        { provide: PushService, useValue: { sendToRestaurants: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(RestaurantsService);
  });

  describe('register', () => {
    it('rejects a duplicate owner email before checking anything else', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'existing' }); // ownerEmail lookup

      await expect(service.register(baseRegisterDto)).rejects.toThrow(ConflictException);
      expect(prisma.db.restaurant.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate phone number', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(null) // ownerEmail lookup: free
        .mockResolvedValueOnce({ id: 'existing' }); // phone lookup: taken

      await expect(service.register(baseRegisterDto)).rejects.toThrow(ConflictException);
      expect(prisma.db.restaurant.create).not.toHaveBeenCalled();
    });

    it('creates the restaurant once email, phone, and a unique code are all available', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(null) // ownerEmail lookup: free
        .mockResolvedValueOnce(null) // phone lookup: free
        .mockResolvedValueOnce(null); // generateUniqueCode's first candidate: free
      prisma.db.restaurant.create.mockResolvedValue({ id: 'new-id', publishStatus: 'NOT_SUBMITTED' });

      const result = await service.register(baseRegisterDto);

      expect(result).toEqual({ id: 'new-id', publishStatus: 'NOT_SUBMITTED' });
      expect(prisma.db.restaurant.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitForPublish', () => {
    it('moves a restaurant that has never submitted into PENDING', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ publishStatus: 'NOT_SUBMITTED' })
        .mockResolvedValueOnce({ id: 'r1', publishStatus: 'PENDING' }); // findOne() after update
      prisma.db.restaurant.update.mockResolvedValue({});

      await service.submitForPublish('r1');

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ publishStatus: 'PENDING' }) }),
      );
    });

    it('allows resubmission after a decline', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ publishStatus: 'REJECTED' })
        .mockResolvedValueOnce({ id: 'r1', publishStatus: 'PENDING' });
      prisma.db.restaurant.update.mockResolvedValue({});

      await expect(service.submitForPublish('r1')).resolves.toBeDefined();
    });

    it('refuses to resubmit while a review is already pending', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });

      await expect(service.submitForPublish('r1')).rejects.toThrow(BadRequestException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('refuses to resubmit once already approved and live', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'APPROVED' });

      await expect(service.submitForPublish('r1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.submitForPublish('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderatePublish', () => {
    it('approves a pending review and clears any prior rejection reason', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });
      prisma.db.restaurant.update.mockResolvedValue({ publishStatus: 'APPROVED' });

      await service.moderatePublish('admin1', 'r1', { status: 'APPROVED' });

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publishStatus: 'APPROVED',
            publishRejectionReason: null,
            publishReviewedById: 'admin1',
          }),
        }),
      );
    });

    it('declines a pending review with the given reason and resets acknowledgement', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });
      prisma.db.restaurant.update.mockResolvedValue({ publishStatus: 'REJECTED' });

      await service.moderatePublish('admin1', 'r1', { status: 'REJECTED', rejectionReason: 'Add more photos' });

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publishStatus: 'REJECTED',
            publishRejectionReason: 'Add more photos',
            publishDeclineAcknowledgedAt: null,
          }),
        }),
      );
    });

    it('refuses to moderate a restaurant with no pending review', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'NOT_SUBMITTED' });

      await expect(service.moderatePublish('admin1', 'r1', { status: 'APPROVED' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acknowledgePublishDecline', () => {
    it('lets the restaurant dismiss a declined review', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ publishStatus: 'REJECTED' })
        .mockResolvedValueOnce({ id: 'r1' }); // findOne() after update
      prisma.db.restaurant.update.mockResolvedValue({});

      await service.acknowledgePublishDecline('r1');

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { publishDeclineAcknowledgedAt: expect.any(Date) } }),
      );
    });

    it('refuses to acknowledge when there is nothing declined', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });

      await expect(service.acknowledgePublishDecline('r1')).rejects.toThrow(BadRequestException);
    });
  });
});
