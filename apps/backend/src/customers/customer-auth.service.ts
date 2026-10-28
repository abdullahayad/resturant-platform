import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';
import { customerTokenSecret, hashLoginCode, safeEqual } from './customer-secrets';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { CustomersService } from './customers.service';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;
const MAX_CODES_PER_HOUR = 5;
const TOKEN_LIFETIME = '90d';

export interface CustomerJwtPayload {
  sub: string; // customer id
  type: 'customer';
  tokenVersion: number;
}

// Fixed phone:code pairs that skip WhatsApp, for the Play Store reviewer
// and for testing before Meta approves the WhatsApp number - set as
// CUSTOMER_TEST_LOGINS="07700000001:123456,07700000002:654321". Unset =
// no test logins at all.
function testLoginCode(phone: string): string | null {
  for (const pair of (process.env.CUSTOMER_TEST_LOGINS ?? '').split(',')) {
    const [testPhone, code] = pair.trim().split(':');
    if (testPhone && code && /^\d{6}$/.test(code) && normalizePhone(testPhone) === phone) return code;
  }
  return null;
}

function readPhone(raw: string): string {
  const phone = normalizePhone(raw);
  if (!/^07\d{9}$/.test(phone)) throw new BadRequestException('Enter a valid Iraqi mobile number');
  return phone;
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly whatsapp: WhatsAppSenderService,
    private readonly customers: CustomersService,
  ) {}

  async requestCode(rawPhone: string, now = new Date()) {
    const phone = readPhone(rawPhone);
    const reply = { sent: true, resendInSeconds: RESEND_AFTER_MS / 1000 };
    if (testLoginCode(phone)) return reply;

    // Limits per phone number (the controller also limits per device/IP),
    // so nobody can flood someone's WhatsApp with codes.
    const recent = await this.prisma.db.customerLoginCode.findMany({
      where: { phone, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent[0] && now.getTime() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
      throw new HttpException('Please wait a minute before asking for a new code', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= MAX_CODES_PER_HOUR) {
      throw new HttpException('Too many codes for this number. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const row = await this.prisma.db.customerLoginCode.create({
      data: { phone, codeHash: hashLoginCode(phone, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS) },
      select: { id: true },
    });
    try {
      await this.whatsapp.sendLoginCode(phone, code);
    } catch (e) {
      // Never delivered - don't let it count against the wait or the limit.
      await this.prisma.db.customerLoginCode.delete({ where: { id: row.id } });
      throw e;
    }
    return reply;
  }

  async verify(rawPhone: string, code: string, now = new Date()) {
    const phone = readPhone(rawPhone);
    const testCode = testLoginCode(phone);

    if (testCode) {
      if (!safeEqual(code, testCode)) throw new BadRequestException('Wrong code');
    } else {
      const latest = await this.prisma.db.customerLoginCode.findFirst({
        where: { phone, usedAt: null, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });
      if (!latest || latest.attempts >= MAX_ATTEMPTS) {
        throw new BadRequestException('This code has expired. Ask for a new one.');
      }
      if (!safeEqual(hashLoginCode(phone, code), latest.codeHash)) {
        await this.prisma.db.customerLoginCode.update({
          where: { id: latest.id },
          data: { attempts: { increment: 1 } },
        });
        throw new BadRequestException('Wrong code');
      }
      // Use the code up in the same step that checks it is still unused,
      // so the same code can never sign in twice.
      const consumed = await this.prisma.db.customerLoginCode.updateMany({
        where: { id: latest.id, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count === 0) throw new BadRequestException('This code has expired. Ask for a new one.');
    }

    const customer = await this.prisma.db.customer.upsert({
      where: { phone },
      create: { phone },
      update: {},
      select: { id: true, tokenVersion: true },
    });
    const payload: CustomerJwtPayload = { sub: customer.id, type: 'customer', tokenVersion: customer.tokenVersion };
    const token = await this.jwt.signAsync(payload, { secret: customerTokenSecret(), expiresIn: TOKEN_LIFETIME });
    return { token, customer: await this.customers.profile(customer.id) };
  }
}
