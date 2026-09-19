import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 20;
// Same merge-then-slice approach as the restaurant-facing ActivityService -
// see that file's comment for why a merged multi-table feed can't use a
// plain per-source skip/take.
const MAX_FETCH_PER_SOURCE = 400;

interface RestaurantSummary {
  id: string;
  nameEn: string;
  nameAr: string;
  codeNumber: string;
}

export type AdminActivityItem =
  | { type: 'dish'; id: string; createdAt: Date; nameEn: string; nameAr: string; restaurant: RestaurantSummary }
  | { type: 'photo'; id: string; createdAt: Date; album: string; restaurant: RestaurantSummary }
  | { type: 'promotion'; id: string; createdAt: Date; titleEn: string; titleAr: string; restaurant: RestaurantSummary }
  | { type: 'event'; id: string; createdAt: Date; titleEn: string; titleAr: string; restaurant: RestaurantSummary };

const restaurantSummarySelect = { id: true, nameEn: true, nameAr: true, codeNumber: true } as const;

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Deliberately only what a restaurant itself adds - not restaurant.updatedAt,
  // which also changes on an admin's own actions (approve/reject/suspend/set
  // chain/etc.) and would misleadingly read as "the restaurant changed
  // something" when it was actually us.
  async recentActivity(pageParam?: number) {
    const page = pageParam && pageParam > 0 ? pageParam : 1;
    const fetchCount = Math.min(page * PAGE_SIZE, MAX_FETCH_PER_SOURCE);

    const [dishes, photos, promotions, events, dishTotal, photoTotal, promotionTotal, eventTotal] = await Promise.all([
      this.prisma.db.dish.findMany({
        select: { id: true, nameEn: true, nameAr: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.galleryPhoto.findMany({
        select: { id: true, album: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.promotion.findMany({
        select: { id: true, titleEn: true, titleAr: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.restaurantEvent.findMany({
        select: { id: true, titleEn: true, titleAr: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.dish.count(),
      this.prisma.db.galleryPhoto.count(),
      this.prisma.db.promotion.count(),
      this.prisma.db.restaurantEvent.count(),
    ]);

    const merged: AdminActivityItem[] = [
      ...dishes.map((d) => ({ type: 'dish' as const, id: d.id, createdAt: d.createdAt, nameEn: d.nameEn, nameAr: d.nameAr, restaurant: d.restaurant })),
      ...photos.map((p) => ({ type: 'photo' as const, id: p.id, createdAt: p.createdAt, album: p.album, restaurant: p.restaurant })),
      ...promotions.map((p) => ({ type: 'promotion' as const, id: p.id, createdAt: p.createdAt, titleEn: p.titleEn, titleAr: p.titleAr, restaurant: p.restaurant })),
      ...events.map((e) => ({ type: 'event' as const, id: e.id, createdAt: e.createdAt, titleEn: e.titleEn, titleAr: e.titleAr, restaurant: e.restaurant })),
    ];
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (page - 1) * PAGE_SIZE;
    const items = merged.slice(start, start + PAGE_SIZE);
    const total = dishTotal + photoTotal + promotionTotal + eventTotal;
    return { items, total, page, pageSize: PAGE_SIZE };
  }
}
