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

interface MasterDataName {
  nameEn: string;
  nameAr: string;
}

// Enough detail per type for an admin to actually look at what was posted
// (the image, the name/title, the description) without a second request -
// not the full editing-level shape restaurant screens use, just what's
// needed to judge "does this look fine."
export type AdminActivityItem =
  | {
      type: 'dish';
      id: string;
      createdAt: Date;
      nameEn: string;
      nameAr: string;
      photoUrl: string | null;
      price: string;
      menuCategory: MasterDataName | null;
      restaurant: RestaurantSummary;
    }
  | { type: 'photo'; id: string; createdAt: Date; album: string; url: string; caption: string | null; restaurant: RestaurantSummary }
  | {
      type: 'promotion';
      id: string;
      createdAt: Date;
      titleEn: string;
      titleAr: string;
      descriptionEn: string | null;
      descriptionAr: string | null;
      photoUrl: string | null;
      discountType: string;
      discountValue: string;
      restaurant: RestaurantSummary;
    }
  | {
      type: 'event';
      id: string;
      createdAt: Date;
      titleEn: string;
      titleAr: string;
      descriptionEn: string | null;
      descriptionAr: string | null;
      photoUrl: string | null;
      restaurant: RestaurantSummary;
    }
  // restaurant is null only for the rare case of an admin's own upload
  // getting blocked (see uploads/moderation.service.ts).
  | { type: 'blockedUpload'; id: string; createdAt: Date; originalName: string; restaurant: RestaurantSummary | null };

const restaurantSummarySelect = { id: true, nameEn: true, nameAr: true, codeNumber: true } as const;

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Deliberately only what a restaurant itself adds - not restaurant.updatedAt,
  // which also changes on an admin's own actions (approve/reject/suspend/set
  // chain/etc.) and would misleadingly read as "the restaurant changed
  // something" when it was actually us. blockedUpload is the one exception -
  // that's never the restaurant's own action, it's something ModerationService
  // stopped, which is exactly why it needs to be visible here.
  async recentActivity(pageParam?: number) {
    const page = pageParam && pageParam > 0 ? pageParam : 1;
    const fetchCount = Math.min(page * PAGE_SIZE, MAX_FETCH_PER_SOURCE);

    const [
      dishes,
      photos,
      promotions,
      events,
      blockedUploads,
      dishTotal,
      photoTotal,
      promotionTotal,
      eventTotal,
      blockedUploadTotal,
    ] = await Promise.all([
      this.prisma.db.dish.findMany({
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          photoUrl: true,
          price: true,
          createdAt: true,
          menuCategory: { select: { nameEn: true, nameAr: true } },
          restaurant: { select: restaurantSummarySelect },
        },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.galleryPhoto.findMany({
        select: { id: true, album: true, url: true, caption: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.promotion.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          descriptionEn: true,
          descriptionAr: true,
          photoUrl: true,
          discountType: true,
          discountValue: true,
          createdAt: true,
          restaurant: { select: restaurantSummarySelect },
        },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.restaurantEvent.findMany({
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          descriptionEn: true,
          descriptionAr: true,
          photoUrl: true,
          createdAt: true,
          restaurant: { select: restaurantSummarySelect },
        },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.blockedUpload.findMany({
        select: { id: true, originalName: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.dish.count(),
      this.prisma.db.galleryPhoto.count(),
      this.prisma.db.promotion.count(),
      this.prisma.db.restaurantEvent.count(),
      this.prisma.db.blockedUpload.count(),
    ]);

    const merged: AdminActivityItem[] = [
      ...dishes.map((d) => ({
        type: 'dish' as const,
        id: d.id,
        createdAt: d.createdAt,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
        photoUrl: d.photoUrl,
        price: d.price.toFixed(2),
        menuCategory: d.menuCategory,
        restaurant: d.restaurant,
      })),
      ...photos.map((p) => ({ type: 'photo' as const, id: p.id, createdAt: p.createdAt, album: p.album, url: p.url, caption: p.caption, restaurant: p.restaurant })),
      ...promotions.map((p) => ({
        type: 'promotion' as const,
        id: p.id,
        createdAt: p.createdAt,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        photoUrl: p.photoUrl,
        discountType: p.discountType,
        discountValue: p.discountValue.toFixed(2),
        restaurant: p.restaurant,
      })),
      ...events.map((e) => ({
        type: 'event' as const,
        id: e.id,
        createdAt: e.createdAt,
        titleEn: e.titleEn,
        titleAr: e.titleAr,
        descriptionEn: e.descriptionEn,
        descriptionAr: e.descriptionAr,
        photoUrl: e.photoUrl,
        restaurant: e.restaurant,
      })),
      ...blockedUploads.map((b) => ({ type: 'blockedUpload' as const, id: b.id, createdAt: b.createdAt, originalName: b.originalName, restaurant: b.restaurant })),
    ];
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (page - 1) * PAGE_SIZE;
    const items = merged.slice(start, start + PAGE_SIZE);
    const total = dishTotal + photoTotal + promotionTotal + eventTotal + blockedUploadTotal;
    return { items, total, page, pageSize: PAGE_SIZE };
  }
}
