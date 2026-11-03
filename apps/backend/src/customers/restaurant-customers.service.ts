import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, baghdadClock } from '../common/baghdadTime';
import { pageOffset } from '../common/pagination';
import { levelFor } from './customer-levels';

// What staff may see about a customer: their name, or only the last digits
// of the number if they never set one - never the full phone number.
export function customerLabel(customer: { name: string | null; phone: string }): string {
  return customer.name ?? `•••• ${customer.phone.slice(-4)}`;
}

// The partner app's view of its own customers: verified visits (scanned
// visit codes) and followers.
@Injectable()
export class RestaurantCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(restaurantId: string, now = new Date()) {
    const today = baghdadClock(now).date;
    const weekStart = addDays(today, -6);
    const [visitsToday, visitsThisWeek, totalVisits, perCustomer, followers] = await Promise.all([
      this.prisma.db.customerVisit.count({ where: { restaurantId, visitDate: today } }),
      this.prisma.db.customerVisit.count({ where: { restaurantId, visitDate: { gte: weekStart } } }),
      this.prisma.db.customerVisit.count({ where: { restaurantId } }),
      this.prisma.db.customerVisit.groupBy({ by: ['customerId'], where: { restaurantId }, _count: { _all: true } }),
      this.prisma.db.customerFollow.count({ where: { restaurantId } }),
    ]);
    return {
      visitsToday,
      visitsThisWeek,
      totalVisits,
      uniqueCustomers: perCustomer.length,
      // Came back on at least one other day.
      returningCustomers: perCustomer.filter((c) => c._count._all > 1).length,
      followers,
    };
  }

  // Newest first, each with the customer's level (from all their verified
  // visits anywhere) and how many times they've visited this restaurant.
  async visits(restaurantId: string, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = { restaurantId };
    const [rows, total] = await Promise.all([
      this.prisma.db.customerVisit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          visitDate: true,
          createdAt: true,
          customerId: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
      this.prisma.db.customerVisit.count({ where }),
    ]);

    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const [allVisits, hereVisits] = customerIds.length
      ? await Promise.all([
          this.prisma.db.customerVisit.groupBy({
            by: ['customerId'],
            where: { customerId: { in: customerIds } },
            _count: { _all: true },
          }),
          this.prisma.db.customerVisit.groupBy({
            by: ['customerId'],
            where: { customerId: { in: customerIds }, restaurantId },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const totalFor = new Map(allVisits.map((v) => [v.customerId, v._count._all]));
    const hereFor = new Map(hereVisits.map((v) => [v.customerId, v._count._all]));

    const items = rows.map((r) => ({
      id: r.id,
      visitDate: r.visitDate,
      createdAt: r.createdAt,
      customerName: customerLabel(r.customer),
      level: levelFor(totalFor.get(r.customerId) ?? 0).level,
      visitsHere: hereFor.get(r.customerId) ?? 0,
    }));
    return { items, total, page, pageSize: take };
  }
}
