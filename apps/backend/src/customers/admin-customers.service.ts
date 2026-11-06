import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { addDays, baghdadClock } from '../common/baghdadTime';
import { pageOffset } from '../common/pagination';
import { normalizePhone } from '../common/phone';
import { isCritic, LEVEL_THRESHOLDS, levelFor } from './customer-levels';
import { CustomersService } from './customers.service';

const restaurantMini = { select: { id: true, nameEn: true, nameAr: true } } as const;

// How close "almost at the next level" is, in visits.
const NEAR_NEXT_LEVEL = 2;

// Admin > Customers: the customer list and detail, blocking, and the
// numbers behind Levels & Critics.
@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async list(query: { q?: string; blocked?: boolean; page?: number }) {
    const { page, skip, take } = pageOffset(query.page);
    const q = query.q?.trim();
    const where: Prisma.CustomerWhereInput = {
      ...(query.blocked ? { blockedAt: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              // Numbers are stored as 07XXXXXXXXX - match however it was typed.
              { phone: { contains: /^\+?\d[\d\s-]*$/.test(q) ? normalizePhone(q) : q } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          phone: true,
          name: true,
          isPublic: true,
          createdAt: true,
          blockedAt: true,
          blockedReason: true,
          _count: { select: { visits: true, reviews: true, follows: true } },
        },
      }),
      this.prisma.db.customer.count({ where }),
    ]);
    const items = rows.map(({ _count, ...c }) => ({
      ...c,
      visitCount: _count.visits,
      reviewCount: _count.reviews,
      followCount: _count.follows,
      level: levelFor(_count.visits).level,
    }));
    return { items, total, page, pageSize: take };
  }

  // What's waiting for an admin - the sidebar's red badges.
  async alerts() {
    const [support, reports, healthy] = await Promise.all([
      this.prisma.db.customerSupportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.db.report.count({ where: { status: 'OPEN' } }),
      this.prisma.db.restaurant.count({ where: { healthyStatus: 'PENDING' } }),
    ]);
    return { support, reports, healthy };
  }

  async stats(now = new Date()) {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = addDays(baghdadClock(now).date, -6);
    const [total, newThisWeek, blocked, activeThisWeek] = await Promise.all([
      this.prisma.db.customer.count(),
      this.prisma.db.customer.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.db.customer.count({ where: { blockedAt: { not: null } } }),
      this.prisma.db.customerVisit.groupBy({ by: ['customerId'], where: { visitDate: { gte: weekStart } } }),
    ]);
    return { total, newThisWeek, blocked, visitedThisWeek: activeThisWeek.length };
  }

  async detail(id: string) {
    const customer = await this.prisma.db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        isPublic: true,
        createdAt: true,
        blockedAt: true,
        blockedReason: true,
        blockedBy: { select: { fullName: true } },
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { id: true, visitDate: true, createdAt: true, restaurant: restaurantMini },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            rating: true,
            text: true,
            createdAt: true,
            moderationStatus: true,
            restaurant: restaurantMini,
          },
        },
        follows: { orderBy: { createdAt: 'desc' }, select: { createdAt: true, restaurant: restaurantMini } },
        _count: { select: { visits: true, reviews: true, follows: true, supportTickets: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    // Bookings are tied to the phone number, not the account (see
    // CustomerActivityService.myBookings).
    const bookings = await this.prisma.db.chefTableBooking.findMany({
      where: { guestPhoneNormalized: customer.phone },
      orderBy: { reservationDate: 'desc' },
      take: 30,
      select: {
        id: true,
        partySize: true,
        reservationDate: true,
        status: true,
        event: { select: { titleEn: true } },
        restaurant: restaurantMini,
      },
    });
    const { _count, ...rest } = customer;
    return {
      ...rest,
      bookings,
      visitCount: _count.visits,
      reviewCount: _count.reviews,
      followCount: _count.follows,
      supportTicketCount: _count.supportTickets,
      ...levelFor(_count.visits),
    };
  }

  async block(id: string, adminId: string, reason: string) {
    await this.ensureExists(id);
    await this.prisma.db.customer.update({
      where: { id },
      data: { blockedAt: new Date(), blockedReason: reason.trim(), blockedById: adminId },
    });
    return this.detail(id);
  }

  async unblock(id: string) {
    await this.ensureExists(id);
    await this.prisma.db.customer.update({
      where: { id },
      data: { blockedAt: null, blockedReason: null, blockedById: null },
    });
    return this.detail(id);
  }

  // Signs the customer out on every phone (e.g. a lost phone).
  async signOutEverywhere(id: string) {
    await this.ensureExists(id);
    await this.prisma.db.customer.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
    return { signedOut: true };
  }

  // For privacy requests - the same full deletion the customer can do from
  // their own Profile.
  async remove(id: string) {
    await this.ensureExists(id);
    return this.customers.remove(id);
  }

  // Removes a fake or mistaken visit (it no longer counts toward the level).
  async removeVisit(visitId: string) {
    const visit = await this.prisma.db.customerVisit.findUnique({ where: { id: visitId }, select: { id: true } });
    if (!visit) throw new NotFoundException('Visit not found');
    await this.prisma.db.customerVisit.delete({ where: { id: visitId } });
    return { id: visitId };
  }

  // Levels & Critics: the rules, how many customers sit at each level, the
  // most active customers, and who is about to level up.
  async levels() {
    const counts = await this.prisma.db.customerVisit.groupBy({
      by: ['customerId'],
      _count: { _all: true },
      orderBy: { _count: { customerId: 'desc' } },
    });
    const totalCustomers = await this.prisma.db.customer.count({ where: { blockedAt: null } });
    const distribution = LEVEL_THRESHOLDS.map((from, i) => ({ level: i + 1, fromVisits: from, customers: 0 }));
    for (const c of counts) distribution[levelFor(c._count._all).level - 1].customers++;
    // Customers with no visits yet are all Level 1.
    distribution[0].customers += Math.max(0, totalCustomers - counts.length);

    const near = counts.filter((c) => {
      const { nextLevelAt } = levelFor(c._count._all);
      return nextLevelAt != null && nextLevelAt - c._count._all <= NEAR_NEXT_LEVEL;
    });
    const top = counts.slice(0, 20);
    const ids = [...new Set([...top, ...near].map((c) => c.customerId))];
    const people = await this.prisma.db.customer.findMany({
      where: { id: { in: ids }, blockedAt: null },
      select: { id: true, name: true, phone: true, isPublic: true, createdAt: true },
    });
    const byId = new Map(people.map((p) => [p.id, p]));
    const shape = (c: { customerId: string; _count: { _all: number } }) => {
      const person = byId.get(c.customerId);
      return person ? [{ ...person, visitCount: c._count._all, ...levelFor(c._count._all) }] : [];
    };
    return {
      distribution,
      topCustomers: top.flatMap(shape),
      nearNextLevel: near.slice(0, 20).flatMap(shape),
    };
  }

  // Everyone with a public profile, a star, or a removed critic status -
  // with whether they currently count as a critic.
  async critics() {
    const rows = await this.prisma.db.customer.findMany({
      where: { OR: [{ isPublic: true }, { isStar: true }, { criticHidden: true }] },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        isPublic: true,
        isStar: true,
        criticHidden: true,
        blockedAt: true,
        _count: { select: { visits: true, reviews: true, criticFollowers: true } },
      },
    });
    return rows
      .map(({ _count, ...c }) => ({
        ...c,
        visitCount: _count.visits,
        reviewCount: _count.reviews,
        followerCount: _count.criticFollowers,
        level: levelFor(_count.visits).level,
        isCritic: isCritic(c, _count.visits),
      }))
      .sort((a, b) => Number(b.isCritic) - Number(a.isCritic) || b.visitCount - a.visitCount);
  }

  async setStar(id: string, isStar: boolean) {
    await this.ensureExists(id);
    await this.prisma.db.customer.update({ where: { id }, data: { isStar } });
    return { id, isStar };
  }

  // Takes the critic status away (or gives it back) without blocking the
  // account - e.g. for undisclosed paid reviews.
  async setCriticHidden(id: string, hidden: boolean) {
    await this.ensureExists(id);
    await this.prisma.db.customer.update({ where: { id }, data: { criticHidden: hidden } });
    return { id, criticHidden: hidden };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.customer.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}
