import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentAccountsService } from './payment-accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentAccountsService', () => {
  let service: PaymentAccountsService;
  let prisma: { db: { restaurant: { findUnique: jest.Mock; update: jest.Mock } } };
  const originalEnv = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(async () => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64');
    prisma = { db: { restaurant: { findUnique: jest.fn(), update: jest.fn() } } };

    const module = await Test.createTestingModule({
      providers: [PaymentAccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PaymentAccountsService);
  });

  afterEach(() => {
    process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY = originalEnv;
  });

  describe('get', () => {
    it('throws NotFoundException for a restaurant that does not exist', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce(null);

      await expect(service.get('missing')).rejects.toThrow(NotFoundException);
    });

    it('reports null for a gateway that has never been connected', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        zainCashMerchantId: null,
        zainCashConnectedAt: null,
        qiCardMerchantId: null,
        qiCardConnectedAt: null,
      });

      const result = await service.get('r1');

      expect(result).toEqual({ zaincash: null, qicard: null });
    });

    it('masks the merchant id down to its last 4 characters for a connected gateway', async () => {
      const connectedAt = new Date('2026-09-17T00:00:00Z');
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        zainCashMerchantId: 'MERCHANT-1234',
        zainCashConnectedAt: connectedAt,
        qiCardMerchantId: null,
        qiCardConnectedAt: null,
      });

      const result = await service.get('r1');

      expect(result.zaincash).toEqual({ merchantId: '••••1234', connectedAt });
      expect(result.qicard).toBeNull();
    });
  });

  describe('connect', () => {
    it('refuses an unknown gateway id', async () => {
      await expect(service.connect('r1', 'not-a-real-gateway', { merchantId: 'm1', secret: 's1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.db.restaurant.update).not.toHaveBeenCalled();
    });

    it('stores the merchant id in plain and the secret encrypted, under the right gateway columns', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        zainCashMerchantId: 'm1',
        zainCashConnectedAt: new Date(),
        qiCardMerchantId: null,
        qiCardConnectedAt: null,
      });

      await service.connect('r1', 'zaincash', { merchantId: 'm1', secret: 'top-secret' });

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({
            zainCashMerchantId: 'm1',
            zainCashConnectedAt: expect.any(Date),
          }),
        }),
      );
      const written = prisma.db.restaurant.update.mock.calls[0][0].data;
      expect(written.zainCashSecretEncrypted).not.toContain('top-secret');
      expect(written).not.toHaveProperty('qiCardMerchantId');
    });
  });

  describe('disconnect', () => {
    it('clears all three columns for the given gateway', async () => {
      prisma.db.restaurant.findUnique.mockResolvedValueOnce({
        zainCashMerchantId: null,
        zainCashConnectedAt: null,
        qiCardMerchantId: null,
        qiCardConnectedAt: null,
      });

      await service.disconnect('r1', 'qicard');

      expect(prisma.db.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { qiCardMerchantId: null, qiCardSecretEncrypted: null, qiCardConnectedAt: null },
      });
    });
  });
});
