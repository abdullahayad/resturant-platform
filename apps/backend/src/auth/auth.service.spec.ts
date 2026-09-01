import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    db: {
      restaurant: { findUnique: jest.Mock };
      partnerStaffUser: { findUnique: jest.Mock };
      adminUser: { findUnique: jest.Mock };
    };
  };
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findUnique: jest.fn() },
        partnerStaffUser: { findUnique: jest.fn() },
        adminUser: { findUnique: jest.fn() },
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('partnerLogin', () => {
    it('logs the owner in when the email and password match a restaurant', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.db.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        codeNumber: '#IRQ-00001',
        nameEn: 'Test',
        nameAr: 'تست',
        status: 'APPROVED',
        rejectionReason: null,
        ownerPasswordHash: passwordHash,
        tokenVersion: 0,
      });

      const result = await service.partnerLogin({ email: 'owner@test.iq', password: 'correct-password' });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.restaurant.id).toBe('r1');
      expect(result.staff).toBeUndefined();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'r1', type: 'partner', tokenVersion: 0 }),
      );
    });

    it('falls back to a staff account on the same email when the owner password does not match', async () => {
      const ownerHash = await bcrypt.hash('owner-password', 4);
      const staffHash = await bcrypt.hash('staff-password', 4);
      prisma.db.restaurant.findUnique
        .mockResolvedValueOnce({ id: 'r1', ownerPasswordHash: ownerHash, tokenVersion: 0 }) // partnerLogin's own lookup
        .mockResolvedValueOnce({
          id: 'r1',
          codeNumber: '#IRQ-00001',
          nameEn: 'Test',
          nameAr: 'تست',
          status: 'APPROVED',
          rejectionReason: null,
          tokenVersion: 0,
        }); // staffLogin's restaurant lookup
      prisma.db.partnerStaffUser.findUnique.mockResolvedValue({
        id: 's1',
        restaurantId: 'r1',
        passwordHash: staffHash,
        isActive: true,
        tokenVersion: 2,
        fullName: 'Staff One',
        role: 'MANAGER',
      });

      const result = await service.partnerLogin({ email: 'staff@test.iq', password: 'staff-password' });

      expect(result.staff).toEqual({ id: 's1', fullName: 'Staff One', role: 'MANAGER' });
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'r1', staffId: 's1', staffRole: 'MANAGER', tokenVersion: 2 }),
      );
    });

    it('rejects a wrong password without revealing whether the account exists', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValue(null);
      prisma.db.partnerStaffUser.findUnique.mockResolvedValue(null);

      await expect(
        service.partnerLogin({ email: 'nobody@test.iq', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated staff account even with the correct password', async () => {
      const staffHash = await bcrypt.hash('staff-password', 4);
      prisma.db.restaurant.findUnique.mockResolvedValue(null);
      prisma.db.partnerStaffUser.findUnique.mockResolvedValue({
        id: 's1',
        restaurantId: 'r1',
        passwordHash: staffHash,
        isActive: false,
        tokenVersion: 0,
      });

      await expect(
        service.partnerLogin({ email: 'staff@test.iq', password: 'staff-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('adminLogin', () => {
    it('logs an active admin in with the correct password', async () => {
      const passwordHash = await bcrypt.hash('admin-password', 4);
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@platform.iq',
        passwordHash,
        isActive: true,
        tokenVersion: 0,
        fullName: 'Admin',
        role: 'SUPER_ADMIN',
      });

      const result = await service.adminLogin({ email: 'admin@platform.iq', password: 'admin-password' });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.admin.role).toBe('SUPER_ADMIN');
    });

    it('rejects an incorrect password', async () => {
      const passwordHash = await bcrypt.hash('admin-password', 4);
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        passwordHash,
        isActive: true,
        tokenVersion: 0,
      });

      await expect(
        service.adminLogin({ email: 'admin@platform.iq', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a deactivated admin account', async () => {
      const passwordHash = await bcrypt.hash('admin-password', 4);
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        passwordHash,
        isActive: false,
        tokenVersion: 0,
      });

      await expect(
        service.adminLogin({ email: 'admin@platform.iq', password: 'admin-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
