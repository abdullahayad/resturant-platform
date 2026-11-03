import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

// Customers following restaurants (the Follow button on a restaurant's page).
@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every restaurant id the customer follows - small enough to send whole,
  // so the app can show Follow / Following anywhere without a call per page.
  async ids(customerId: string): Promise<string[]> {
    const rows = await this.prisma.db.customerFollow.findMany({
      where: { customerId },
      select: { restaurantId: true },
    });
    return rows.map((r) => r.restaurantId);
  }

  async list(customerId: string) {
    const rows = await this.prisma.db.customerFollow.findMany({
      where: { customerId, restaurant: { status: 'APPROVED', publishStatus: 'APPROVED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        restaurant: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            logoUrl: true,
            district: { select: { id: true, nameEn: true, nameAr: true } },
          },
        },
      },
    });
    return rows.map((r) => r.restaurant);
  }

  // Following twice is harmless (no error), so a double tap never fails.
  async follow(customerId: string, restaurantId: string) {
    const live = await this.prisma.db.restaurant.findFirst({
      where: { id: restaurantId, status: 'APPROVED', publishStatus: 'APPROVED' },
      select: { id: true },
    });
    if (!live) throw new NotFoundException('Restaurant not found');
    try {
      await this.prisma.db.customerFollow.create({ data: { customerId, restaurantId } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
    return { following: true };
  }

  async unfollow(customerId: string, restaurantId: string) {
    await this.prisma.db.customerFollow.deleteMany({ where: { customerId, restaurantId } });
    return { following: false };
  }
}
