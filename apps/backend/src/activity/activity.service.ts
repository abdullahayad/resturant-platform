import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FEED_SIZE = 20;
// Pulled per-source before merging - comfortably more than FEED_SIZE so a
// restaurant with a burst of activity in one source (e.g. 15 reviews in a
// day) doesn't crowd out the other two before the merge-and-trim step.
const PER_SOURCE_LIMIT = 15;

export type ActivityItem =
  | { type: 'review'; id: string; createdAt: Date; reviewerName: string; rating: number }
  | { type: 'reservation'; id: string; createdAt: Date; guestName: string; partySize: number; eventTitleEn: string }
  | { type: 'announcement'; id: string; createdAt: Date; titleEn: string; titleAr: string };

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Reservations are omitted for MENU_EDITOR staff - Chef Table & Events is
  // Manager/Owner-only everywhere else in the app (ManagerOrOwnerGuard), so
  // a Menu Editor's feed shouldn't reference bookings they can't otherwise see.
  async recentActivity(restaurantId: string, includeReservations: boolean): Promise<ActivityItem[]> {
    const [reviews, reservations, announcements] = await Promise.all([
      this.prisma.db.review.findMany({
        where: { restaurantId, moderationStatus: { not: 'HIDDEN' } },
        select: { id: true, reviewerName: true, rating: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: PER_SOURCE_LIMIT,
      }),
      includeReservations
        ? this.prisma.db.chefTableBooking.findMany({
            where: { restaurantId },
            select: { id: true, guestName: true, partySize: true, createdAt: true, event: { select: { titleEn: true } } },
            orderBy: { createdAt: 'desc' },
            take: PER_SOURCE_LIMIT,
          })
        : Promise.resolve([]),
      this.prisma.db.notificationRecipient.findMany({
        where: { restaurantId },
        select: { id: true, notification: { select: { titleEn: true, titleAr: true, createdAt: true } } },
        orderBy: { notification: { createdAt: 'desc' } },
        take: PER_SOURCE_LIMIT,
      }),
    ]);

    const items: ActivityItem[] = [
      ...reviews.map((r) => ({ type: 'review' as const, id: r.id, createdAt: r.createdAt, reviewerName: r.reviewerName, rating: r.rating })),
      ...reservations.map((r) => ({
        type: 'reservation' as const,
        id: r.id,
        createdAt: r.createdAt,
        guestName: r.guestName,
        partySize: r.partySize,
        eventTitleEn: r.event.titleEn,
      })),
      ...announcements.map((a) => ({
        type: 'announcement' as const,
        id: a.id,
        createdAt: a.notification.createdAt,
        titleEn: a.notification.titleEn,
        titleAr: a.notification.titleAr,
      })),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items.slice(0, FEED_SIZE);
  }
}
