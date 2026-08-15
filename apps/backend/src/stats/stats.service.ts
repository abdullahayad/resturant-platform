import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async platformStats() {
    const [totalPartners, activeCount, inactiveCount, pendingApprovals, rejectedCount, totalReviews, flaggedReviews] =
      await Promise.all([
        this.prisma.db.restaurant.count(),
        this.prisma.db.restaurant.count({ where: { status: 'APPROVED' } }),
        this.prisma.db.restaurant.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.db.restaurant.count({ where: { status: 'PENDING_REVIEW' } }),
        this.prisma.db.restaurant.count({ where: { status: 'REJECTED' } }),
        this.prisma.db.review.count(),
        this.prisma.db.review.count({ where: { moderationStatus: 'FLAGGED' } }),
      ]);

    return {
      totalPartners,
      activeCount,
      inactiveCount,
      pendingApprovals,
      rejectedCount,
      totalReviews,
      flaggedReviews,
    };
  }
}
