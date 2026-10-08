import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { Prisma } from '../../generated/prisma/client';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prisma: { db: Record<string, Record<string, jest.Mock>> };
  let jwt: { signAsync: jest.Mock };
  let activityLog: { log: jest.Mock };
  let email: { send: jest.Mock };
  const fakeUser = { sub: 'r1', type: 'partner', restaurantStatus: 'APPROVED', tokenVersion: 0 } as PartnerJwtPayload;

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
          findUniqueOrThrow: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          delete: jest.fn(),
        },
        partnerStaffUser: {
          findUnique: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        restaurantChain: {
          findUnique: jest.fn(),
        },
        adminSupportSession: {
          create: jest.fn(),
        },
        dish: {
          aggregate: jest.fn().mockResolvedValue({ _avg: { price: null } }),
        },
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    activityLog = { log: jest.fn() };
    email = { send: jest.fn().mockResolvedValue(true) };

    const module = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: email },
        { provide: PushService, useValue: { sendToRestaurants: jest.fn().mockResolvedValue(undefined) } },
        { provide: RestaurantActivityLogService, useValue: activityLog },
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
        .mockResolvedValueOnce(null); // generateFallbackCode's first candidate: free (no province/district set here)
      prisma.db.restaurant.create.mockResolvedValue({ id: 'new-id', publishStatus: 'NOT_SUBMITTED' });

      const result = await service.register(baseRegisterDto);

      expect(result).toEqual({ id: 'new-id', publishStatus: 'NOT_SUBMITTED' });
      expect(prisma.db.restaurant.create).toHaveBeenCalledTimes(1);
    });

    it('converts a database-level unique-constraint race into the same clean message', async () => {
      // Simulates two signups for the same email/phone landing at the same
      // instant: both pass the pre-check above (mocked null here), and only
      // collide at the database's own unique constraint on the insert.
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(null) // ownerEmail lookup: free
        .mockResolvedValueOnce(null) // phone lookup: free
        .mockResolvedValueOnce(null); // generateFallbackCode's first candidate: free (no province/district set here)
      prisma.db.restaurant.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`ownerEmail`)', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      let caught: unknown;
      try {
        await service.register(baseRegisterDto);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ConflictException);
      expect((caught as ConflictException).message).toBe('An account with this email or phone number already exists');
    });
  });

  describe('updateProfile', () => {
    const liveBefore = {
      nameEn: 'Old Name',
      nameAr: 'اسم قديم',
      phone: '07700000000',
      logoUrl: null,
      provinceId: 'p1',
      districtId: 'd1',
      latitude: 33.3,
      longitude: 44.4,
      publishStatus: 'APPROVED',
      province: { nameEn: 'Baghdad' },
      district: { nameEn: 'Karkh' },
      businessTypes: [],
      foodCategories: [],
      facilities: [],
    };

    it('rejects a name change once the restaurant is live', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(liveBefore);

      await expect(service.updateProfile('r1', { nameEn: 'New Name' }, fakeUser)).rejects.toThrow(ForbiddenException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('rejects a phone change once the restaurant is live', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(liveBefore);

      await expect(service.updateProfile('r1', { phone: '07711111111' }, fakeUser)).rejects.toThrow(ForbiddenException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('rejects a location change once the restaurant is live', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(liveBefore);

      await expect(service.updateProfile('r1', { districtId: 'd2' }, fakeUser)).rejects.toThrow(ForbiddenException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('allows resubmitting the same locked values while live - no actual change attempted', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(liveBefore) // before
        .mockResolvedValueOnce(liveBefore) // after (diff logic)
        .mockResolvedValueOnce({ id: 'r1' }); // findOne() at the end
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await expect(
        service.updateProfile('r1', { nameEn: 'Old Name', logoUrl: 'https://x/new-logo.png' }, fakeUser),
      ).resolves.toBeDefined();
      expect(prisma.db.restaurant.update).toHaveBeenCalled();
    });

    it('allows changing locked fields before the restaurant has gone live', async () => {
      const notYetLive = { ...liveBefore, publishStatus: 'NOT_SUBMITTED' };
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(notYetLive)
        .mockResolvedValueOnce(notYetLive)
        .mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await expect(service.updateProfile('r1', { nameEn: 'New Name' }, fakeUser)).resolves.toBeDefined();
      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1', publishStatus: { not: 'APPROVED' } } }),
      );
    });

    it('rejects a locked-field change if the listing was approved after the lock check', async () => {
      const notYetLive = { ...liveBefore, publishStatus: 'PENDING' };
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(notYetLive);
      prisma.db.restaurant.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('No record found', { code: 'P2025', clientVersion: 'test' }),
      );

      await expect(service.updateProfile('r1', { nameEn: 'New Name' }, fakeUser)).rejects.toThrow(ForbiddenException);
    });

    it('lets the admin path (no user) change locked fields even while live', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce(liveBefore)
        .mockResolvedValueOnce(liveBefore)
        .mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      // No third argument - this is how restaurants.controller.ts's
      // admin-only adminUpdate route calls it.
      await expect(service.updateProfile('r1', { nameEn: 'New Name' })).resolves.toBeDefined();
      expect(prisma.db.restaurant.update).toHaveBeenCalled();
    });

    it('still blocks a locked-field change from an admin support session, with a message pointing at the admin route instead', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(liveBefore);
      const impersonatingUser = { ...fakeUser, impersonatedBy: 'admin1' };

      await expect(service.updateProfile('r1', { nameEn: 'New Name' }, impersonatingUser)).rejects.toThrow(
        /admin portal/,
      );
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });
  });

  describe('submitForPublish', () => {
    it('moves a restaurant that has never submitted into PENDING', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ publishStatus: 'NOT_SUBMITTED' })
        .mockResolvedValueOnce({ id: 'r1', publishStatus: 'PENDING' }); // findOne() after update
      prisma.db.restaurant.update.mockResolvedValue({});

      await service.submitForPublish('r1', fakeUser);

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ publishStatus: 'PENDING' }) }),
      );
    });

    it('allows resubmission after a decline', async () => {
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ publishStatus: 'REJECTED' })
        .mockResolvedValueOnce({ id: 'r1', publishStatus: 'PENDING' });
      prisma.db.restaurant.update.mockResolvedValue({});

      await expect(service.submitForPublish('r1', fakeUser)).resolves.toBeDefined();
    });

    it('refuses to resubmit while a review is already pending', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });

      await expect(service.submitForPublish('r1', fakeUser)).rejects.toThrow(BadRequestException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('refuses to resubmit once already approved and live', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'APPROVED' });

      await expect(service.submitForPublish('r1', fakeUser)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.submitForPublish('missing', fakeUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderatePublish', () => {
    it('approves a pending review and clears any prior rejection reason', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });
      prisma.db.restaurant.updateMany.mockResolvedValue({ count: 1 });
      prisma.db.restaurant.findUniqueOrThrow.mockResolvedValue({ publishStatus: 'APPROVED' });

      await service.moderatePublish('admin1', 'r1', { status: 'APPROVED' });

      expect(prisma.db.restaurant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1', publishStatus: 'PENDING' },
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
      prisma.db.restaurant.updateMany.mockResolvedValue({ count: 1 });
      prisma.db.restaurant.findUniqueOrThrow.mockResolvedValue({ publishStatus: 'REJECTED' });

      await service.moderatePublish('admin1', 'r1', { status: 'REJECTED', rejectionReason: 'Add more photos' });

      expect(prisma.db.restaurant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1', publishStatus: 'PENDING' },
          data: expect.objectContaining({
            publishStatus: 'REJECTED',
            publishRejectionReason: 'Add more photos',
            publishDeclineAcknowledgedAt: null,
          }),
        }),
      );
    });

    it('refuses to moderate when a concurrent request already moderated it first', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });
      prisma.db.restaurant.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.moderatePublish('admin1', 'r1', { status: 'APPROVED' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.db.restaurant.findUniqueOrThrow).not.toHaveBeenCalled();
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

      await service.acknowledgePublishDecline('r1', fakeUser);

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { publishDeclineAcknowledgedAt: expect.any(Date) } }),
      );
    });

    it('refuses to acknowledge when there is nothing declined', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ publishStatus: 'PENDING' });

      await expect(service.acknowledgePublishDecline('r1', fakeUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAccount', () => {
    it('deletes only the staff member when a staff login requests deletion', async () => {
      prisma.db.partnerStaffUser.delete.mockResolvedValue({});

      const result = await service.deleteAccount({
        sub: 'r1',
        type: 'partner',
        restaurantStatus: 'APPROVED',
        tokenVersion: 0,
        staffId: 's1',
        staffRole: 'MENU_EDITOR',
      });

      expect(prisma.db.partnerStaffUser.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(prisma.db.restaurant.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 'staff' });
    });

    it('deletes the whole restaurant when the owner login requests deletion', async () => {
      prisma.db.restaurant.delete.mockResolvedValue({});

      const result = await service.deleteAccount({
        sub: 'r1',
        type: 'partner',
        restaurantStatus: 'APPROVED',
        tokenVersion: 0,
      });

      expect(prisma.db.restaurant.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
      expect(prisma.db.partnerStaffUser.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 'restaurant' });
    });
  });

  describe('forgotPassword', () => {
    it('generates and stores a reset code on the restaurant when the email matches an owner', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      const result = await service.forgotPassword({ email: 'owner@test.iq' });

      expect(result).toEqual({ success: true });
      expect(prisma.db.partnerStaffUser.findUnique).not.toHaveBeenCalled();
      const data = prisma.db.restaurant.update.mock.calls[0][0];
      expect(data.where).toEqual({ id: 'r1' });
      expect(data.data.passwordResetCodeHash).toEqual(expect.any(String));
      // Within a few seconds of "now + 15 minutes" - not asserting an exact
      // timestamp, which would make this test flaky.
      const expectedExpiry = Date.now() + 15 * 60 * 1000;
      expect(Math.abs(data.data.passwordResetExpiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
      expect(email.send).toHaveBeenCalledWith(
        'owner@test.iq',
        expect.any(String),
        expect.stringContaining('reset code'),
      );
    });

    it('falls back to the staff table and generates a code there when no owner matches', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce({ id: 's1' });
      prisma.db.partnerStaffUser.update.mockResolvedValueOnce({});

      const result = await service.forgotPassword({ email: 'staff@test.iq' });

      expect(result).toEqual({ success: true });
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
      const data = prisma.db.partnerStaffUser.update.mock.calls[0][0];
      expect(data.where).toEqual({ id: 's1' });
      expect(data.data.passwordResetCodeHash).toEqual(expect.any(String));
      expect(email.send).toHaveBeenCalledWith(
        'staff@test.iq',
        expect.any(String),
        expect.stringContaining('reset code'),
      );
    });

    it('still returns success for an email matching neither table, without sending anything - anti-enumeration', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({ email: 'nobody@test.iq' });

      expect(result).toEqual({ success: true });
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
      expect(prisma.db.partnerStaffUser.update).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('resets the owner password, bumps tokenVersion, and clears the reset code on a valid restaurant code', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        id: 'r1',
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      const result = await service.resetPassword({ email: 'owner@test.iq', code: '123456', newPassword: 'newPass123' });

      expect(result).toEqual({ success: true });
      expect(prisma.db.partnerStaffUser.findUnique).not.toHaveBeenCalled();
      const data = prisma.db.restaurant.update.mock.calls[0][0];
      expect(data.where).toEqual({ id: 'r1' });
      expect(data.data.tokenVersion).toEqual({ increment: 1 });
      expect(data.data.passwordResetCodeHash).toBeNull();
      expect(data.data.passwordResetExpiresAt).toBeNull();
      expect(data.data.ownerPasswordHash).not.toBe('newPass123'); // stored hashed, never plaintext
    });

    it('resets the staff password on a valid staff code, independently of the restaurant table', async () => {
      const codeHash = await bcrypt.hash('654321', 10);
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce({
        id: 's1',
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      prisma.db.partnerStaffUser.update.mockResolvedValueOnce({});

      const result = await service.resetPassword({ email: 'staff@test.iq', code: '654321', newPassword: 'newPass456' });

      expect(result).toEqual({ success: true });
      const data = prisma.db.partnerStaffUser.update.mock.calls[0][0];
      expect(data.where).toEqual({ id: 's1' });
      expect(data.data.tokenVersion).toEqual({ increment: 1 });
      expect(data.data.passwordResetCodeHash).toBeNull();
      expect(data.data.passwordHash).not.toBe('newPass456');
    });

    it('rejects a code that does not match the stored hash', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        id: 'r1',
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword({ email: 'owner@test.iq', code: '000000', newPassword: 'newPass123' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('rejects a correct code that has already expired', async () => {
      const codeHash = await bcrypt.hash('123456', 10);
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        id: 'r1',
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: new Date(Date.now() - 60 * 1000), // expired a minute ago
      });
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword({ email: 'owner@test.iq', code: '123456', newPassword: 'newPass123' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('rejects when no account has ever requested a reset code', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        id: 'r1',
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      });
      prisma.db.partnerStaffUser.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword({ email: 'owner@test.iq', code: '123456', newPassword: 'newPass123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setChain', () => {
    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.setChain('missing', 'c1')).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('refuses to link to a chain that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurantChain.findUnique.mockResolvedValueOnce(null);

      await expect(service.setChain('r1', 'missing-chain')).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('links a restaurant to a chain that exists', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurantChain.findUnique.mockResolvedValueOnce({ id: 'c1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setChain('r1', 'c1');

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { chainId: 'c1' } }),
      );
    });

    it('clears the link when chainId is null, without checking any chain exists', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setChain('r1', null);

      expect(prisma.db.restaurantChain.findUnique).not.toHaveBeenCalled();
      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { chainId: null } }),
      );
    });
  });

  describe('setClass', () => {
    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.setClass('missing', 'LUXURY')).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it("sets a restaurant's class", async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setClass('r1', 'BUDGET');

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { class: 'BUDGET' } }),
      );
    });

    it('clears the class when given null', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setClass('r1', null);

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { class: null } }),
      );
    });
  });

  describe('setVerified', () => {
    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.setVerified('missing', true)).rejects.toThrow(NotFoundException);
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('marks a restaurant verified - a deliberate standalone action, not tied to any document submission', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setVerified('r1', true);

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { isVerified: true } }),
      );
    });

    it('can unmark a restaurant as verified', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.restaurant.update.mockResolvedValueOnce({});

      await service.setVerified('r1', false);

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { isVerified: false } }),
      );
    });
  });

  describe('findOne', () => {
    it("includes the average price of the restaurant's active dishes", async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.dish.aggregate.mockResolvedValueOnce({ _avg: { price: { toString: () => '18500.5' } } });

      const result = await service.findOne('r1');

      expect(prisma.db.dish.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'r1', isActive: true } }),
      );
      expect(result.averageDishPrice).toBe(18500.5);
    });

    it('reports a null average when the restaurant has no active dishes', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({ id: 'r1' });
      prisma.db.dish.aggregate.mockResolvedValueOnce({ _avg: { price: null } });

      const result = await service.findOne('r1');

      expect(result.averageDishPrice).toBeNull();
    });
  });

  describe('createAdminSupportSession', () => {
    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.createAdminSupportSession('admin1', 'missing')).rejects.toThrow(NotFoundException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
      expect(prisma.db.adminSupportSession.create).not.toHaveBeenCalled();
    });

    it("mints a token carrying the restaurant's own tokenVersion and the admin who started it, and logs the session", async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        id: 'r1',
        nameEn: 'Al Baghdadi',
        nameAr: 'البغدادي',
        status: 'APPROVED',
        tokenVersion: 3,
      });
      prisma.db.adminSupportSession.create.mockResolvedValueOnce({});

      const result = await service.createAdminSupportSession('admin1', 'r1');

      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'r1',
          type: 'partner',
          restaurantStatus: 'APPROVED',
          tokenVersion: 3,
          impersonatedBy: 'admin1',
        }),
        { expiresIn: '30m' },
      );
      expect(prisma.db.adminSupportSession.create).toHaveBeenCalledWith({
        data: { adminId: 'admin1', restaurantId: 'r1' },
      });
      expect(result).toEqual({
        accessToken: 'token',
        restaurant: { id: 'r1', nameEn: 'Al Baghdadi', nameAr: 'البغدادي' },
      });
    });
  });
});
