import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerNotificationsService } from '../push/customer-notifications.service';
import { pageOffset } from '../common/pagination';

// Mirrors prisma/schema.prisma's enums.
export const SUPPORT_TOPICS = ['BOOKING', 'RESTAURANT_INFO', 'LOGIN', 'ACCOUNT', 'OTHER'] as const;
export type SupportTopicValue = (typeof SUPPORT_TOPICS)[number];
export const SUPPORT_STATUSES = ['OPEN', 'WAITING', 'CLOSED'] as const;
export type SupportStatusValue = (typeof SUPPORT_STATUSES)[number];

// One customer can't flood the inbox: at most this many open conversations.
const MAX_OPEN_TICKETS = 5;

const messageSelect = {
  id: true,
  text: true,
  createdAt: true,
  fromAdmin: { select: { fullName: true } },
} as const;

const restaurantMini = { select: { id: true, nameEn: true, nameAr: true } } as const;

// Help conversations: customers write from the customer app, LiGETA answers
// from Admin > Customers > Customer Support.
@Injectable()
export class CustomerSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerNotifications: CustomerNotificationsService,
  ) {}

  // ── customer side ────────────────────────────────────────────────────

  async myTickets(customerId: string) {
    return this.prisma.db.customerSupportTicket.findMany({
      where: { customerId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        topic: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        restaurant: restaurantMini,
        messages: { orderBy: { createdAt: 'asc' }, select: messageSelect },
      },
    });
  }

  async open(customerId: string, topic: SupportTopicValue, text: string, restaurantId?: string) {
    const openCount = await this.prisma.db.customerSupportTicket.count({
      where: { customerId, status: { not: 'CLOSED' } },
    });
    if (openCount >= MAX_OPEN_TICKETS) {
      throw new BadRequestException('You already have several open conversations - please reply in one of those');
    }
    if (restaurantId) {
      const exists = await this.prisma.db.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Restaurant not found');
    }
    const ticket = await this.prisma.db.customerSupportTicket.create({
      data: { customerId, topic, restaurantId, messages: { create: { text: text.trim() } } },
      select: { id: true },
    });
    return this.myTicket(customerId, ticket.id);
  }

  async customerReply(customerId: string, ticketId: string, text: string) {
    await this.myTicket(customerId, ticketId);
    await this.prisma.db.customerSupportTicket.update({
      where: { id: ticketId },
      // Any customer message puts it back in LiGETA's court, even a closed one.
      data: { status: 'OPEN', messages: { create: { text: text.trim() } } },
    });
    return this.myTicket(customerId, ticketId);
  }

  private async myTicket(customerId: string, ticketId: string) {
    const ticket = await this.prisma.db.customerSupportTicket.findFirst({
      where: { id: ticketId, customerId },
      select: {
        id: true,
        topic: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        restaurant: restaurantMini,
        messages: { orderBy: { createdAt: 'asc' }, select: messageSelect },
      },
    });
    if (!ticket) throw new NotFoundException('Conversation not found');
    return ticket;
  }

  // ── admin side ───────────────────────────────────────────────────────

  async adminList(status: SupportStatusValue | undefined, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = status ? { status } : {};
    const [rows, total, counts] = await Promise.all([
      this.prisma.db.customerSupportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          topic: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: { select: { id: true, name: true, phone: true } },
          restaurant: restaurantMini,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, fromAdminId: true } },
        },
      }),
      this.prisma.db.customerSupportTicket.count({ where }),
      this.prisma.db.customerSupportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const items = rows.map(({ messages, ...t }) => ({
      ...t,
      lastMessage: messages[0]?.text ?? '',
      lastFromCustomer: messages[0] ? messages[0].fromAdminId == null : true,
    }));
    const statusCounts = Object.fromEntries(SUPPORT_STATUSES.map((s) => [s, 0])) as Record<SupportStatusValue, number>;
    for (const c of counts) statusCounts[c.status] = c._count._all;
    return { items, total, page, pageSize: take, statusCounts };
  }

  // The conversation plus what the admin needs next to it: the customer's
  // latest bookings and visits.
  async adminDetail(ticketId: string) {
    const ticket = await this.prisma.db.customerSupportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        topic: true,
        status: true,
        createdAt: true,
        restaurant: restaurantMini,
        customer: { select: { id: true, name: true, phone: true, createdAt: true, blockedAt: true } },
        messages: { orderBy: { createdAt: 'asc' }, select: messageSelect },
      },
    });
    if (!ticket) throw new NotFoundException('Conversation not found');
    const [bookings, visits] = await Promise.all([
      this.prisma.db.chefTableBooking.findMany({
        where: { guestPhoneNormalized: ticket.customer.phone },
        orderBy: { reservationDate: 'desc' },
        take: 5,
        select: {
          id: true,
          reservationDate: true,
          partySize: true,
          status: true,
          event: { select: { titleEn: true } },
          restaurant: restaurantMini,
        },
      }),
      this.prisma.db.customerVisit.findMany({
        where: { customerId: ticket.customer.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, visitDate: true, restaurant: restaurantMini },
      }),
    ]);
    return { ...ticket, recentBookings: bookings, recentVisits: visits };
  }

  async adminReply(ticketId: string, adminId: string, text: string) {
    await this.ensureExists(ticketId);
    const ticket = await this.prisma.db.customerSupportTicket.update({
      where: { id: ticketId },
      data: { status: 'WAITING', messages: { create: { text: text.trim(), fromAdminId: adminId } } },
      select: { customerId: true },
    });
    this.customerNotifications.supportReplied(ticket.customerId).catch(() => {});
    return this.adminDetail(ticketId);
  }

  async adminSetStatus(ticketId: string, status: SupportStatusValue) {
    await this.ensureExists(ticketId);
    await this.prisma.db.customerSupportTicket.update({ where: { id: ticketId }, data: { status } });
    return this.adminDetail(ticketId);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.customerSupportTicket.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Conversation not found');
  }
}
