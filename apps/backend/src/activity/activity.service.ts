import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 10;
// A merged, time-sorted feed from 3 different tables can't be paginated
// with a plain skip/take per source - "page 2" might be 7 reviews and 3
// reservations, or 10 announcements and nothing else, depending on how
// activity happened to land. Instead, each source is asked for enough rows
// to cover every page up to and including the requested one (page * 10),
// then all three are merged, sorted, and sliced to the exact 10 this page
// needs. Capped so a very deep page request can't force an unbounded
// per-source fetch - a restaurant would need to page in this feed ~20
// times before results even risk becoming slightly stale near the cap,
// well past what anyone realistically scrolls through in a "recent
// activity" feed.
const MAX_FETCH_PER_SOURCE = 200;

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
  async recentActivity(restaurantId: string, includeReservations: boolean, pageParam?: number) {
    const page = pageParam && pageParam > 0 ? pageParam : 1;
    const fetchCount = Math.min(page * PAGE_SIZE, MAX_FETCH_PER_SOURCE);
    const reviewWhere = { restaurantId, moderationStatus: { not: 'HIDDEN' as const } };
    const reservationWhere = { restaurantId };
    const announcementWhere = { restaurantId };

    const [reviews, reservations, announcements, reviewTotal, reservationTotal, announcementTotal] = await Promise.all([
      this.prisma.db.review.findMany({
        where: reviewWhere,
        select: { id: true, reviewerName: true, rating: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      includeReservations
        ? this.prisma.db.chefTableBooking.findMany({
            where: reservationWhere,
            select: { id: true, guestName: true, partySize: true, createdAt: true, event: { select: { titleEn: true } } },
            orderBy: { createdAt: 'desc' },
            take: fetchCount,
          })
        : Promise.resolve([]),
      this.prisma.db.notificationRecipient.findMany({
        where: announcementWhere,
        select: { id: true, notification: { select: { titleEn: true, titleAr: true, createdAt: true } } },
        orderBy: { notification: { createdAt: 'desc' } },
        take: fetchCount,
      }),
      this.prisma.db.review.count({ where: reviewWhere }),
      includeReservations ? this.prisma.db.chefTableBooking.count({ where: reservationWhere }) : Promise.resolve(0),
      this.prisma.db.notificationRecipient.count({ where: announcementWhere }),
    ]);

    const merged: ActivityItem[] = [
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
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (page - 1) * PAGE_SIZE;
    const items = merged.slice(start, start + PAGE_SIZE);
    const total = reviewTotal + reservationTotal + announcementTotal;
    return { items, total, page, pageSize: PAGE_SIZE };
  }
}
