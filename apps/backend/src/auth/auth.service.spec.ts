import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateBase32Secret } from '../common/totp';

// Mirrors totp.ts's own HOTP math exactly (RFC 4226/6238) purely so tests
// can produce a code that verifyTotp() will actually accept, without
// exporting a "give me today's code" helper from production code.
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function currentTotpCode(base32Secret: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(base32Secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return (truncated % 1_000_000).toString().padStart(6, '0');
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    db: {
      restaurant: { findUnique: jest.Mock };
      partnerStaffUser: { findUnique: jest.Mock };
      adminUser: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock };
    };
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      db: {
        restaurant: { findUnique: jest.fn() },
        partnerStaffUser: { findUnique: jest.fn() },
        adminUser: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
      },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token'), verifyAsync: jest.fn() };

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

      if (!('accessToken' in result)) throw new Error('expected a completed login, not a 2FA challenge');
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

    it('returns a pending 2FA challenge instead of a session for a 2FA-enabled admin', async () => {
      const passwordHash = await bcrypt.hash('admin-password', 4);
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@platform.iq',
        passwordHash,
        isActive: true,
        tokenVersion: 0,
        fullName: 'Admin',
        role: 'SUPER_ADMIN',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRETSECRETSECRETSE',
      });

      const result = await service.adminLogin({ email: 'admin@platform.iq', password: 'admin-password' });

      if (!('twoFactorRequired' in result)) throw new Error('expected a 2FA challenge');
      expect(result.pendingToken).toBe('signed.jwt.token');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'a1', type: 'admin-2fa-pending' }),
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });
  });

  describe('completeAdminTwoFactor', () => {
    it('completes login with a valid pending token and a valid code', async () => {
      const secret = generateBase32Secret();
      jwt.verifyAsync.mockResolvedValue({ sub: 'a1', type: 'admin-2fa-pending' });
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@platform.iq',
        fullName: 'Admin',
        role: 'SUPER_ADMIN',
        tokenVersion: 0,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      });

      const result = await service.completeAdminTwoFactor('pending.token', currentTotpCode(secret));

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.admin.id).toBe('a1');
    });

    it('rejects an incorrect code', async () => {
      const secret = generateBase32Secret();
      jwt.verifyAsync.mockResolvedValue({ sub: 'a1', type: 'admin-2fa-pending' });
      prisma.db.adminUser.findUnique.mockResolvedValue({
        id: 'a1',
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      });

      await expect(service.completeAdminTwoFactor('pending.token', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired or tampered pending token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.completeAdminTwoFactor('pending.token', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('two-factor enrollment', () => {
    it('startTwoFactorSetup stores a fresh secret and returns an otpauth URL', async () => {
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({ id: 'a1', email: 'admin@platform.iq' });

      const result = await service.startTwoFactorSetup('a1');

      expect(result.otpauthUrl).toContain('admin%40platform.iq');
      expect(prisma.db.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { twoFactorSecret: result.secret },
      });
    });

    it('enableTwoFactor accepts a valid code and flips twoFactorEnabled on', async () => {
      const secret = generateBase32Secret();
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({ id: 'a1', twoFactorSecret: secret });

      await service.enableTwoFactor('a1', currentTotpCode(secret));

      expect(prisma.db.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { twoFactorEnabled: true },
      });
    });

    it('enableTwoFactor rejects an invalid code', async () => {
      const secret = generateBase32Secret();
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({ id: 'a1', twoFactorSecret: secret });

      await expect(service.enableTwoFactor('a1', '000000')).rejects.toThrow(UnauthorizedException);
    });

    it('enableTwoFactor rejects when setup was never started', async () => {
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({ id: 'a1', twoFactorSecret: null });

      await expect(service.enableTwoFactor('a1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('disableTwoFactor accepts a valid code and clears the secret', async () => {
      const secret = generateBase32Secret();
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({
        id: 'a1',
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      });

      await service.disableTwoFactor('a1', currentTotpCode(secret));

      expect(prisma.db.adminUser.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
    });

    it('disableTwoFactor rejects when 2FA is not currently enabled', async () => {
      prisma.db.adminUser.findUniqueOrThrow.mockResolvedValue({
        id: 'a1',
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });

      await expect(service.disableTwoFactor('a1', '123456')).rejects.toThrow(BadRequestException);
    });
  });
});
