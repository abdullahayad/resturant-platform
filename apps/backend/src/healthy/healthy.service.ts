import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const visibleHealthyDish = { isHealthy: true, isActive: true, moderationStatus: { not: 'HIDDEN' as const } };

// The 🌿 Healthy tag: a restaurant asks for it (after marking at least one
// healthy dish), a LiGETA admin approves or rejects it, and only an
// approved tag shows in the customer app's Healthy mode. An admin can also
// remove it later, e.g. after customer complaints.
@Injectable()
export class HealthyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  async status(restaurantId: string) {
    const [restaurant, healthyDishCount] = await Promise.all([
      this.prisma.db.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          healthyStatus: true,
          healthyRequestedAt: true,
          healthyRequestNote: true,
          healthyRejectionReason: true,
          healthyReviewedAt: true,
        },
      }),
      this.prisma.db.dish.count({ where: { restaurantId, ...visibleHealthyDish } }),
    ]);
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return { ...restaurant, healthyDishCount };
  }

  async request(restaurantId: string, note: string | undefined, user: PartnerJwtPayload) {
    const current = await this.status(restaurantId);
    if (current.healthyStatus === 'PENDING' || current.healthyStatus === 'APPROVED') {
      throw new BadRequestException('A Healthy tag request is already in place');
    }
    if (current.healthyDishCount === 0) {
      throw new BadRequestException('Mark at least one dish as healthy before asking for the tag');
    }
    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: {
        healthyStatus: 'PENDING',
        healthyRequestedAt: new Date(),
        healthyRequestNote: note?.trim() || null,
        healthyRejectionReason: null,
        healthyReviewedAt: null,
      },
    });
    await this.activityLog.log({ restaurantId, section: 'settings', summary: 'Asked for the Healthy tag', user });
    return this.status(restaurantId);
  }

  // Admin: pending requests first, then every tagged restaurant - each with
  // the dishes it marked healthy, so the admin can judge the request.
  async adminList(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.db.restaurant.findMany({
      where: status ? { healthyStatus: status } : { healthyStatus: { not: 'NONE' } },
      orderBy: [{ healthyStatus: 'desc' }, { healthyRequestedAt: 'desc' }],
      select: {
        id: true,
        codeNumber: true,
        nameEn: true,
        nameAr: true,
        logoUrl: true,
        healthyStatus: true,
        healthyRequestedAt: true,
        healthyRequestNote: true,
        healthyRejectionReason: true,
        healthyReviewedAt: true,
        district: { select: { nameEn: true, nameAr: true } },
        dishes: {
          where: visibleHealthyDish,
          select: { id: true, nameEn: true, nameAr: true, price: true, photoUrl: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // Approve (isHealthy true), or reject / remove with a reason the
  // restaurant sees in its app.
  async adminDecide(restaurantId: string, isHealthy: boolean, reason?: string) {
    const exists = await this.prisma.db.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Restaurant not found');
    if (!isHealthy && !reason?.trim()) throw new BadRequestException('Give the restaurant a reason');
    await this.prisma.db.restaurant.update({
      where: { id: restaurantId },
      data: isHealthy
        ? { healthyStatus: 'APPROVED', healthyRejectionReason: null, healthyReviewedAt: new Date() }
        : { healthyStatus: 'REJECTED', healthyRejectionReason: reason!.trim(), healthyReviewedAt: new Date() },
    });
    return this.status(restaurantId);
  }
}
