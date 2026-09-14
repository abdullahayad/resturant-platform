import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import type { CreateNotificationDto } from './dto/notification.dto';
import { pageOffset } from '../common/pagination';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(adminId: string, dto: CreateNotificationDto) {
    const targetRestaurantIds = await this.resolveTargets(dto);
    if (targetRestaurantIds.length === 0) {
      throw new BadRequestException('No restaurants match the selected target');
    }
    const notification = await this.prisma.db.adminNotification.create({
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        bodyEn: dto.bodyEn,
        bodyAr: dto.bodyAr,
        actionRequired: dto.actionRequired ?? false,
        createdById: adminId,
        recipients: { create: targetRestaurantIds.map((restaurantId) => ({ restaurantId })) },
      },
    });
    this.push.sendToRestaurants(targetRestaurantIds, dto.titleEn, dto.bodyEn, { screen: 'announcements' }).catch(() => {});
    return notification;
  }

  private async resolveTargets(dto: CreateNotificationDto): Promise<string[]> {
    if (dto.restaurantId) {
      const restaurant = await this.prisma.db.restaurant.findUnique({
        where: { id: dto.restaurantId },
        select: { id: true },
      });
      return restaurant ? [restaurant.id] : [];
    }

    const restaurants = await this.prisma.db.restaurant.findMany({
      where: {
        provinceId: dto.provinceId,
        businessTypes: dto.businessTypeId ? { some: { businessTypeId: dto.businessTypeId } } : undefined,
      },
      select: { id: true },
    });
    return restaurants.map((r) => r.id);
  }

  async list() {
    const notifications = await this.prisma.db.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { fullName: true } } },
    });
    if (notifications.length === 0) return [];

    const ids = notifications.map((n) => n.id);
    const [totalCounts, readCounts, ackCounts, unseenReplyCounts] = await Promise.all([
      this.prisma.db.notificationRecipient.groupBy({
        by: ['notificationId'],
        where: { notificationId: { in: ids } },
        _count: true,
      }),
      this.prisma.db.notificationRecipient.groupBy({
        by: ['notificationId'],
        where: { notificationId: { in: ids }, readAt: { not: null } },
        _count: true,
      }),
      this.prisma.db.notificationRecipient.groupBy({
        by: ['notificationId'],
        where: { notificationId: { in: ids }, acknowledgedAt: { not: null } },
        _count: true,
      }),
      this.prisma.db.notificationRecipient.groupBy({
        by: ['notificationId'],
        where: { notificationId: { in: ids }, replyText: { not: null }, replySeenAt: null },
        _count: true,
      }),
    ]);
    const totalMap = new Map(totalCounts.map((c) => [c.notificationId, c._count]));
    const readMap = new Map(readCounts.map((c) => [c.notificationId, c._count]));
    const ackMap = new Map(ackCounts.map((c) => [c.notificationId, c._count]));
    const unseenReplyMap = new Map(unseenReplyCounts.map((c) => [c.notificationId, c._count]));

    return notifications.map((n) => ({
      ...n,
      recipientCount: totalMap.get(n.id) ?? 0,
      readCount: readMap.get(n.id) ?? 0,
      acknowledgedCount: ackMap.get(n.id) ?? 0,
      unseenReplyCount: unseenReplyMap.get(n.id) ?? 0,
    }));
  }

  // Viewing a notification's recipient list is how an admin actually reads
  // any replies on it — same "viewing marks it read" idea as the
  // restaurant-side Inbox already uses for announcements — so any unseen
  // reply here gets marked seen as a side effect of this call, clearing the
  // "N new replies" badge in list() for next time.
  async recipients(notificationId: string) {
    const notification = await this.prisma.db.adminNotification.findUnique({
      where: { id: notificationId },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    const recipients = await this.prisma.db.notificationRecipient.findMany({
      where: { notificationId },
      include: { restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
      orderBy: { restaurant: { nameEn: 'asc' } },
    });

    await this.prisma.db.notificationRecipient.updateMany({
      where: { notificationId, replyText: { not: null }, replySeenAt: null },
      data: { replySeenAt: new Date() },
    });

    return recipients;
  }

  async remove(id: string) {
    const notification = await this.prisma.db.adminNotification.findUnique({ where: { id }, select: { id: true } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.prisma.db.adminNotification.delete({ where: { id } });
    return { id };
  }

  // ── Restaurant-facing ──────────────────────────────────────────────────

  async listForRestaurant(restaurantId: string, pageParam?: number) {
    const where = { restaurantId };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.notificationRecipient.findMany({
        where,
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        skip,
        take,
      }),
      this.prisma.db.notificationRecipient.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async unreadCount(restaurantId: string) {
    const count = await this.prisma.db.notificationRecipient.count({ where: { restaurantId, readAt: null } });
    return { count };
  }

  async markRead(restaurantId: string, notificationId: string) {
    const recipient = await this.ensureRecipient(restaurantId, notificationId);
    if (recipient.readAt) return recipient;
    return this.prisma.db.notificationRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
      include: { notification: true },
    });
  }

  async markAcknowledged(restaurantId: string, notificationId: string) {
    const recipient = await this.ensureRecipient(restaurantId, notificationId);
    return this.prisma.db.notificationRecipient.update({
      where: { id: recipient.id },
      data: { readAt: recipient.readAt ?? new Date(), acknowledgedAt: new Date() },
      include: { notification: true },
    });
  }

  // One reply per recipient, not a thread — rejects a second attempt rather
  // than overwriting the first.
  async reply(restaurantId: string, notificationId: string, text: string) {
    const recipient = await this.ensureRecipient(restaurantId, notificationId);
    if (recipient.replyText) throw new BadRequestException('You have already replied to this announcement');
    return this.prisma.db.notificationRecipient.update({
      where: { id: recipient.id },
      data: { replyText: text, repliedAt: new Date() },
      include: { notification: true },
    });
  }

  private async ensureRecipient(restaurantId: string, notificationId: string) {
    const recipient = await this.prisma.db.notificationRecipient.findUnique({
      where: { notificationId_restaurantId: { notificationId, restaurantId } },
      include: { notification: true },
    });
    if (!recipient) throw new NotFoundException('Notification not found');
    return recipient;
  }
}
