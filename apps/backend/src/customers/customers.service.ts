import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { baghdadClock } from '../common/baghdadTime';
import { pageOffset } from '../common/pagination';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { CRITIC_MIN_VISITS, isCritic, levelFor } from './customer-levels';
import { makeVisitCode, readVisitCode } from './customer-secrets';
import { customerLabel } from './restaurant-customers.service';

// The feature flag that switches visit scanning on per restaurant (Admin >
// Feature Flags) - the partner app hides the Scan card without it, and the
// server refuses without it too.
const VISIT_SCAN_FLAG = 'visitScan';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async profile(customerId: string) {
    const [customer, visitCount] = await Promise.all([
      this.prisma.db.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          phone: true,
          name: true,
          isPublic: true,
          createdAt: true,
          isStar: true,
          criticHidden: true,
          blockedAt: true,
          specialtyIds: true,
          _count: { select: { criticFollowers: true } },
        },
      }),
      this.prisma.db.customerVisit.count({ where: { customerId } }),
    ]);
    if (!customer) throw new NotFoundException('Account not found');
    return {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      isPublic: customer.isPublic,
      createdAt: customer.createdAt,
      isStar: customer.isStar,
      specialtyIds: customer.specialtyIds,
      visitCount,
      ...levelFor(visitCount),
      // Whether other customers can find and follow them right now.
      isCritic: isCritic(customer, visitCount),
      criticMinVisits: CRITIC_MIN_VISITS,
      followerCount: customer._count.criticFollowers,
    };
  }

  async update(customerId: string, data: { name?: string; isPublic?: boolean; specialtyIds?: string[] }) {
    if (data.specialtyIds?.length) {
      const found = await this.prisma.db.foodCategory.count({
        where: { id: { in: data.specialtyIds }, isActive: true },
      });
      if (found !== new Set(data.specialtyIds).size) throw new BadRequestException('Unknown cuisine');
    }
    await this.prisma.db.customer.update({
      where: { id: customerId },
      data: {
        name: data.name?.trim() || (data.name === undefined ? undefined : null),
        isPublic: data.isPublic,
        specialtyIds: data.specialtyIds ? [...new Set(data.specialtyIds)] : undefined,
      },
    });
    return this.profile(customerId);
  }

  visitCode(customerId: string) {
    return makeVisitCode(customerId);
  }

  async visits(customerId: string, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = { customerId };
    const [rows, total] = await Promise.all([
      this.prisma.db.customerVisit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          visitDate: true,
          restaurant: { select: { id: true, nameEn: true, nameAr: true, logoUrl: true } },
        },
      }),
      this.prisma.db.customerVisit.count({ where }),
    ]);
    return { items: rows, total, page, pageSize: take };
  }

  // Deletes the account and everything tied to it (visits cascade), plus
  // any login codes still stored for the number. Required by Google Play
  // for any app that lets people create an account.
  async remove(customerId: string) {
    const customer = await this.prisma.db.customer.findUnique({ where: { id: customerId }, select: { phone: true } });
    if (!customer) return { deleted: true };
    await this.prisma.db.$transaction([
      this.prisma.db.customerLoginCode.deleteMany({ where: { phone: customer.phone } }),
      this.prisma.db.customer.delete({ where: { id: customerId } }),
    ]);
    return { deleted: true };
  }

  // Partner app: staff scan the customer's "My visit code". Counts one
  // visit per customer, per restaurant, per Baghdad day.
  async scanVisit(partner: PartnerJwtPayload, code: string, now = new Date()) {
    const restaurantId = partner.sub;
    const enabled = await this.flags.resolveEnabledKeys(restaurantId);
    if (!enabled.includes(VISIT_SCAN_FLAG)) throw new ForbiddenException('Visit scanning is not switched on');

    const customerId = readVisitCode(code, now);
    const customer = customerId
      ? await this.prisma.db.customer.findUnique({
          where: { id: customerId },
          select: { name: true, phone: true, blockedAt: true },
        })
      : null;
    // A blocked account's code simply doesn't count.
    if (!customerId || !customer || customer.blockedAt) throw new BadRequestException('Code not recognised');

    let alreadyToday = false;
    try {
      await this.prisma.db.customerVisit.create({
        data: {
          customerId,
          restaurantId,
          visitDate: baghdadClock(now).date,
          scannedByStaffId: partner.staffId ?? null,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      alreadyToday = true;
    }

    const visitCount = await this.prisma.db.customerVisit.count({ where: { customerId } });
    return {
      customerName: customerLabel(customer),
      level: levelFor(visitCount).level,
      visitCount,
      alreadyToday,
    };
  }
}
