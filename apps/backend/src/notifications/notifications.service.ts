import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
    // Fire-and-forget — a push delivery failure shouldn't fail the admin's
    // request, and there's nothing useful to surface to them if it does.
    this.sendPushNotifications(targetRestaurantIds, dto.titleEn, dto.bodyEn).catch(() => {});
    return notification;
  }

  // Push text is always sent in English regardless of each device's app
  // language — the backend has no record of which language a given device
  // has selected (that preference lives only in the app's local storage).
  private async sendPushNotifications(restaurantIds: string[], title: string, body: string) {
    const tokens = await this.prisma.db.restaurantPushToken.findMany({
      where: { restaurantId: { in: restaurantIds } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({ to: t.token, title, body, sound: 'default' }));
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      }).catch(() => {});
    }
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
    const [totalCounts, readCounts, ackCounts] = await Promise.all([
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
    ]);
    const totalMap = new Map(totalCounts.map((c) => [c.notificationId, c._count]));
    const readMap = new Map(readCounts.map((c) => [c.notificationId, c._count]));
    const ackMap = new Map(ackCounts.map((c) => [c.notificationId, c._count]));

    return notifications.map((n) => ({
      ...n,
      recipientCount: totalMap.get(n.id) ?? 0,
      readCount: readMap.get(n.id) ?? 0,
      acknowledgedCount: ackMap.get(n.id) ?? 0,
    }));
  }

  async recipients(notificationId: string) {
    const notification = await this.prisma.db.adminNotification.findUnique({
      where: { id: notificationId },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.db.notificationRecipient.findMany({
      where: { notificationId },
      include: { restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
      orderBy: { restaurant: { nameEn: 'asc' } },
    });
  }

  async remove(id: string) {
    const notification = await this.prisma.db.adminNotification.findUnique({ where: { id }, select: { id: true } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.prisma.db.adminNotification.delete({ where: { id } });
    return { id };
  }

  // ── Restaurant-facing ──────────────────────────────────────────────────

  listForRestaurant(restaurantId: string) {
    return this.prisma.db.notificationRecipient.findMany({
      where: { restaurantId },
      include: { notification: true },
      orderBy: { notification: { createdAt: 'desc' } },
    });
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

  private async ensureRecipient(restaurantId: string, notificationId: string) {
    const recipient = await this.prisma.db.notificationRecipient.findUnique({
      where: { notificationId_restaurantId: { notificationId, restaurantId } },
      include: { notification: true },
    });
    if (!recipient) throw new NotFoundException('Notification not found');
    return recipient;
  }
}
