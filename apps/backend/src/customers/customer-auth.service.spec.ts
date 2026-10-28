import { Test } from '@nestjs/testing';
import { BadRequestException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerAuthService } from './customer-auth.service';
import { CustomersService } from './customers.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { PrismaService } from '../prisma/prisma.service';
import { customerTokenSecret, hashLoginCode } from './customer-secrets';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let jwt: JwtService;
  let prisma: {
    db: {
      customerLoginCode: {
        findMany: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
      customer: { upsert: jest.Mock };
    };
  };
  let whatsapp: { sendLoginCode: jest.Mock };
  const now = new Date('2026-10-28T09:30:00Z');
  const phone = '07701234567';

  beforeAll(() => {
    process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
  });

  beforeEach(async () => {
    delete process.env.CUSTOMER_TEST_LOGINS;
    prisma = {
      db: {
        customerLoginCode: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'code-1' }),
          delete: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        customer: { upsert: jest.fn().mockResolvedValue({ id: 'cust-1', tokenVersion: 0 }) },
      },
    };
    whatsapp = { sendLoginCode: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppSenderService, useValue: whatsapp },
        { provide: CustomersService, useValue: { profile: jest.fn().mockResolvedValue({ id: 'cust-1' }) } },
      ],
    }).compile();
    service = module.get(CustomerAuthService);
    jwt = module.get(JwtService);
  });

  describe('requestCode', () => {
    it('stores only a hash of the code and sends the code on WhatsApp', async () => {
      await service.requestCode('+964 770 123 4567', now);

      const [sentPhone, code] = whatsapp.sendLoginCode.mock.calls[0] as [string, string];
      expect(sentPhone).toBe(phone);
      expect(code).toMatch(/^\d{6}$/);
      const [{ data }] = prisma.db.customerLoginCode.create.mock.calls[0] as [{ data: { codeHash: string } }];
      expect(data.codeHash).toBe(hashLoginCode(phone, code));
      expect(data.codeHash).not.toContain(code);
    });

    it('makes the customer wait a minute between codes, and caps codes per hour', async () => {
      prisma.db.customerLoginCode.findMany.mockResolvedValueOnce([{ createdAt: new Date(now.getTime() - 30_000) }]);
      await expect(service.requestCode(phone, now)).rejects.toThrow(HttpException);

      prisma.db.customerLoginCode.findMany.mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(now.getTime() - (i + 2) * 60_000) })),
      );
      await expect(service.requestCode(phone, now)).rejects.toThrow(HttpException);
      expect(whatsapp.sendLoginCode).not.toHaveBeenCalled();
    });

    it("forgets a code WhatsApp couldn't deliver", async () => {
      whatsapp.sendLoginCode.mockRejectedValueOnce(new Error('down'));
      await expect(service.requestCode(phone, now)).rejects.toThrow('down');
      expect(prisma.db.customerLoginCode.delete).toHaveBeenCalledWith({ where: { id: 'code-1' } });
    });

    it('rejects numbers that are not Iraqi mobiles', async () => {
      await expect(service.requestCode('12345', now)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verify', () => {
    const stored = (code: string, attempts = 0) => ({ id: 'code-1', codeHash: hashLoginCode(phone, code), attempts });

    it('signs in with the right code, using it up, and issues a customer-only token', async () => {
      prisma.db.customerLoginCode.findFirst.mockResolvedValueOnce(stored('123456'));

      const { token } = await service.verify(phone, '123456', now);

      expect(prisma.db.customerLoginCode.updateMany).toHaveBeenCalledWith({
        where: { id: 'code-1', usedAt: null },
        data: { usedAt: now },
      });
      const payload = await jwt.verifyAsync<{ sub: string; type: string }>(token, { secret: customerTokenSecret() });
      expect(payload).toMatchObject({ sub: 'cust-1', type: 'customer' });
      // Partner/admin routes verify with JWT_SECRET itself - this token must fail there.
      await expect(jwt.verifyAsync(token, { secret: process.env.JWT_SECRET })).rejects.toThrow();
    });

    it('counts a wrong try and refuses after too many', async () => {
      prisma.db.customerLoginCode.findFirst.mockResolvedValueOnce(stored('123456'));
      await expect(service.verify(phone, '000000', now)).rejects.toThrow('Wrong code');
      expect(prisma.db.customerLoginCode.update).toHaveBeenCalled();

      prisma.db.customerLoginCode.findFirst.mockResolvedValueOnce(stored('123456', 5));
      await expect(service.verify(phone, '123456', now)).rejects.toThrow(BadRequestException);
      expect(prisma.db.customer.upsert).not.toHaveBeenCalled();
    });

    it('refuses a code that another request already used', async () => {
      prisma.db.customerLoginCode.findFirst.mockResolvedValueOnce(stored('123456'));
      prisma.db.customerLoginCode.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.verify(phone, '123456', now)).rejects.toThrow(BadRequestException);
    });

    it('accepts a configured test login without WhatsApp', async () => {
      process.env.CUSTOMER_TEST_LOGINS = '07700000001:654321';
      await expect(service.requestCode('07700000001', now)).resolves.toMatchObject({ sent: true });
      expect(whatsapp.sendLoginCode).not.toHaveBeenCalled();
      await expect(service.verify('07700000001', '654321', now)).resolves.toHaveProperty('token');
      await expect(service.verify('07700000001', '111111', now)).rejects.toThrow('Wrong code');
    });
  });
});
