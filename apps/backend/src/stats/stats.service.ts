import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async platformStats() {
    // One grouped query per table instead of a separate count() per status -
    // Sentry flagged the old version as an N+1 query pattern.
    const [restaurantsByStatus, reviewsByModerationStatus] = await Promise.all([
      this.prisma.db.restaurant.groupBy({ by: ['status'], _count: true }),
      this.prisma.db.review.groupBy({ by: ['moderationStatus'], _count: true }),
    ]);

    const restaurantCount = (status: 'APPROVED' | 'SUSPENDED' | 'PENDING_REVIEW' | 'REJECTED') =>
      restaurantsByStatus.find((r) => r.status === status)?._count ?? 0;

    return {
      totalPartners: restaurantsByStatus.reduce((sum, r) => sum + r._count, 0),
      activeCount: restaurantCount('APPROVED'),
      inactiveCount: restaurantCount('SUSPENDED'),
      pendingApprovals: restaurantCount('PENDING_REVIEW'),
      rejectedCount: restaurantCount('REJECTED'),
      totalReviews: reviewsByModerationStatus.reduce((sum, r) => sum + r._count, 0),
      flaggedReviews: reviewsByModerationStatus.find((r) => r.moderationStatus === 'FLAGGED')?._count ?? 0,
    };
  }
}
