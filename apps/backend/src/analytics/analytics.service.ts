import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Which statuses count as a "real" booking for analytics purposes — matches
// the same definition the Loyalty program already uses for counting
// qualifying bookings, duplicated here rather than imported since this is
// restaurant-analytics logic, not loyalty logic, even though the values match.
const QUALIFYING_STATUSES = ['CONFIRMED', 'COMPLETED'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const RATING_TREND_WEEKS = 6;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async restaurantAnalytics(restaurantId: string) {
    const [busiestDay, ratingTrend, repeatGuestRate] = await Promise.all([
      this.busiestDayOfWeek(restaurantId),
      this.ratingTrend(restaurantId),
      this.repeatGuestRate(restaurantId),
    ]);
    return { busiestDay, ratingTrend, repeatGuestRate };
  }

  // Day-of-week only, not hour-of-day — reservationDate doesn't reliably carry
  // a meaningful time component the way an event's own schedule does, so a
  // day-of-week breakdown is the honest level of detail to offer here.
  private async busiestDayOfWeek(restaurantId: string) {
    const bookings = await this.prisma.db.chefTableBooking.findMany({
      where: { restaurantId, status: { in: [...QUALIFYING_STATUSES] } },
      select: { reservationDate: true },
    });
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    for (const b of bookings) counts[b.reservationDate.getDay()]++;
    return counts;
  }

  // Last RATING_TREND_WEEKS weekly averages (most recent week last), plus the
  // same last-30-vs-previous-30-day trend figure already shown on the
  // Customer Reviews screen, so the two screens stay consistent with each other.
  private async ratingTrend(restaurantId: string) {
    const reviews = await this.prisma.db.review.findMany({
      where: { restaurantId, moderationStatus: { not: 'HIDDEN' } },
      select: { rating: true, createdAt: true },
    });

    const now = Date.now();
    const weekly: { weekStart: string; average: number | null; count: number }[] = [];
    for (let i = RATING_TREND_WEEKS - 1; i >= 0; i--) {
      const weekEnd = now - i * WEEK_MS;
      const weekStart = weekEnd - WEEK_MS;
      const inWeek = reviews.filter((r) => {
        const t = r.createdAt.getTime();
        return t > weekStart && t <= weekEnd;
      });
      weekly.push({
        weekStart: new Date(weekStart).toISOString(),
        average: inWeek.length ? inWeek.reduce((sum, r) => sum + r.rating, 0) / inWeek.length : null,
        count: inWeek.length,
      });
    }

    const last30 = reviews.filter((r) => now - r.createdAt.getTime() <= 30 * DAY_MS);
    const prev30 = reviews.filter((r) => {
      const age = now - r.createdAt.getTime();
      return age > 30 * DAY_MS && age <= 60 * DAY_MS;
    });
    const avg = (rows: { rating: number }[]) => (rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null);
    const last30Average = avg(last30);
    const prev30Average = avg(prev30);
    const trend = last30Average != null && prev30Average != null ? last30Average - prev30Average : null;

    return { weekly, last30Average, trend };
  }

  // % of this restaurant's qualifying bookings that come from a guest phone
  // number with more than one qualifying booking here.
  private async repeatGuestRate(restaurantId: string) {
    const groups = await this.prisma.db.chefTableBooking.groupBy({
      by: ['guestPhoneNormalized'],
      where: { restaurantId, status: { in: [...QUALIFYING_STATUSES] } },
      _count: { _all: true },
    });

    const totalBookings = groups.reduce((sum, g) => sum + g._count._all, 0);
    const repeatBookings = groups.filter((g) => g._count._all > 1).reduce((sum, g) => sum + g._count._all, 0);
    const uniqueGuests = groups.length;
    const repeatGuests = groups.filter((g) => g._count._all > 1).length;

    return {
      totalBookings,
      uniqueGuests,
      repeatGuests,
      pctOfBookingsFromRepeatGuests: totalBookings ? Math.round((repeatBookings / totalBookings) * 100) : 0,
    };
  }
}
