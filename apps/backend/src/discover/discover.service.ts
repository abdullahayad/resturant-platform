import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { pageOffset, type Paginated } from '../common/pagination';
import { isPromotionLiveNow } from '../promotions/promotion-pricing';
import { isOpenAt, opensAfterMidnight } from './open-now';
import type { DiscoverQueryDto, DiscoverSort, SurpriseQueryDto } from './dto/discover-query.dto';
import { containsPattern, foldSearchText, foldSql } from './search-text';

// Ratings are ranked with a "smoothed" average: every restaurant starts
// with PRIOR_WEIGHT imaginary reviews of PRIOR_MEAN stars, so one lucky
// 5-star review can't put a brand-new place above one with a hundred
// 4.6-star reviews. Constants, not user input - safe to inline in SQL.
const PRIOR_WEIGHT = 5;
const PRIOR_MEAN = 3.5;

const MAX_FEATURED = 10;

const named = { select: { id: true, nameEn: true, nameAr: true } } as const;

const cardSelect = {
  id: true,
  nameEn: true,
  nameAr: true,
  logoUrl: true,
  class: true,
  healthyStatus: true,
  isVerified: true,
  latitude: true,
  longitude: true,
  province: named,
  district: named,
  chain: named,
  businessTypes: { select: { businessType: named } },
  foodCategories: { select: { foodCategory: named } },
  openingHours: { select: { dayOfWeek: true, isClosed: true, openTime: true, closeTime: true } },
  // The owner's own cover shot first, else their newest food/ambience photo
  // (never a paper-menu scan or a customer's review photo).
  galleryPhotos: {
    where: { moderationStatus: { not: 'HIDDEN' }, album: { in: ['FOOD', 'AMBIENCE'] } },
    orderBy: [{ isCover: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.RestaurantSelect;

const promotionScheduleSelect = {
  restaurantId: true,
  isRecurring: true,
  validFrom: true,
  validUntil: true,
  recurringDayOfWeek: true,
  startTime: true,
  endTime: true,
} as const;

interface RankRow {
  id: string;
  isFeatured: boolean;
  rating: number | null;
  reviewCount: number;
  distanceMeters: number | null;
}

interface RankOptions {
  sort: DiscoverSort;
  point: { lat: number; lng: number } | null;
  radiusKm?: number;
  skip: number;
  take: number;
  now: Date;
}

// Everything a list/map card in the customer app needs - deliberately
// small; the full restaurant page comes from /restaurants/:id/public-page.
export interface RestaurantCard {
  id: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  class: string | null;
  isVerified: boolean;
  // The admin-approved 🌿 Healthy tag.
  isHealthy: boolean;
  isFeatured: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  rating: number | null;
  reviewCount: number;
  priceFrom: number | null;
  hasOffer: boolean;
  isOpenNow: boolean | null;
  province: { id: string; nameEn: string; nameAr: string } | null;
  district: { id: string; nameEn: string; nameAr: string } | null;
  chain: { id: string; nameEn: string; nameAr: string } | null;
  businessTypes: { id: string; nameEn: string; nameAr: string }[];
  foodCategories: { id: string; nameEn: string; nameAr: string }[];
}

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  // Explore / search / mood results. Filtering happens in three passes:
  // plain database filters (Prisma), then the checks that need Baghdad
  // time or promotion schedules (done in code, same helpers the rest of
  // the app uses), then ranking + distance + paging in one SQL query.
  async search(query: DiscoverQueryDto, now = new Date()): Promise<Paginated<RestaurantCard>> {
    const point = this.readPoint(query);
    const sort = query.sort ?? 'recommended';
    if (sort === 'nearest' && !point) throw new BadRequestException('Sorting by nearest needs lat and lng');
    const { page, skip, take } = pageOffset(query.page);
    const empty = { items: [], total: 0, page, pageSize: take };

    const filter = await this.buildWhere(query, now);
    if (!filter) return empty;

    let ids = (await this.prisma.db.restaurant.findMany({ where: filter.where, select: { id: true } })).map(
      (r) => r.id,
    );

    if (ids.length && (query.openNow || filter.afterMidnight)) {
      const hours = await this.prisma.db.openingHours.findMany({
        where: { restaurantId: { in: ids } },
        select: { restaurantId: true, dayOfWeek: true, isClosed: true, openTime: true, closeTime: true },
      });
      const byRestaurant = groupBy(hours, (h) => h.restaurantId);
      ids = ids.filter((id) => {
        const rows = byRestaurant.get(id) ?? [];
        if (query.openNow && isOpenAt(rows, now) !== true) return false;
        if (filter.afterMidnight && !opensAfterMidnight(rows)) return false;
        return true;
      });
    }

    if (ids.length && query.offersOnly) {
      const withOffer = await this.restaurantsWithLiveOffer(ids, now);
      ids = ids.filter((id) => withOffer.has(id));
    }

    if (!ids.length) return empty;

    const options: RankOptions = { sort, point, radiusKm: query.radiusKm, skip, take, now };
    const [rows, total] = await Promise.all([this.rank(ids, options), this.countWithinRadius(ids, options)]);
    return { items: await this.toCards(rows, now), total, page, pageSize: take };
  }

  // "لا تفوّتها · Don't miss these" on Home - restaurants with a live
  // Featured placement (the Sponsored row), best-rated first.
  async featured(now = new Date()): Promise<RestaurantCard[]> {
    const placements = await this.prisma.db.featuredPlacement.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
        restaurant: { status: 'APPROVED', publishStatus: 'APPROVED' },
      },
      select: { restaurantId: true },
    });
    const ids = [...new Set(placements.map((p) => p.restaurantId))];
    if (!ids.length) return [];
    const rows = await this.rank(ids, { sort: 'recommended', point: null, skip: 0, take: MAX_FEATURED, now });
    return this.toCards(rows, now);
  }

  // "Surprise me": one random live restaurant in the area, picked from the
  // ones open right now when there are any. Never one already shown this
  // round. null when the area has nothing (left).
  async surprise(query: SurpriseQueryDto, now = new Date(), random = Math.random): Promise<RestaurantCard | null> {
    const filter = await this.buildWhere({ provinceId: query.provinceId, districtId: query.districtId }, now);
    if (!filter) return null;
    const exclude = new Set(query.exclude ?? []);
    const ids = (await this.prisma.db.restaurant.findMany({ where: filter.where, select: { id: true } }))
      .map((r) => r.id)
      .filter((id) => !exclude.has(id));
    if (!ids.length) return null;

    const hours = await this.prisma.db.openingHours.findMany({
      where: { restaurantId: { in: ids } },
      select: { restaurantId: true, dayOfWeek: true, isClosed: true, openTime: true, closeTime: true },
    });
    const byRestaurant = groupBy(hours, (h) => h.restaurantId);
    const open = ids.filter((id) => isOpenAt(byRestaurant.get(id) ?? [], now) === true);
    const pool = open.length ? open : ids;
    const pick = pool[Math.floor(random() * pool.length)];

    const rows = await this.rank([pick], { sort: 'recommended', point: null, skip: 0, take: 1, now });
    return (await this.toCards(rows, now))[0] ?? null;
  }

  private readPoint(query: DiscoverQueryDto): { lat: number; lng: number } | null {
    if ((query.lat == null) !== (query.lng == null)) throw new BadRequestException('Send lat and lng together');
    if (query.lat == null || query.lng == null) {
      if (query.radiusKm != null) throw new BadRequestException('radiusKm needs lat and lng');
      return null;
    }
    return { lat: query.lat, lng: query.lng };
  }

  // null means "nothing can match" (an unknown/switched-off mood, or a
  // Healthy mood while no restaurant can hold the Healthy tag yet).
  private async buildWhere(
    query: DiscoverQueryDto,
    now: Date,
  ): Promise<{ where: Prisma.RestaurantWhereInput; afterMidnight: boolean } | null> {
    // Only restaurants that are both approved and published (live) - the
    // same gate as the public restaurant page.
    const and: Prisma.RestaurantWhereInput[] = [{ status: 'APPROVED', publishStatus: 'APPROVED' }];
    let afterMidnight = false;

    if (query.provinceId) and.push({ provinceId: query.provinceId });
    if (query.districtId) and.push({ districtId: query.districtId });
    if (query.businessTypeIds?.length) {
      and.push({ businessTypes: { some: { businessTypeId: { in: query.businessTypeIds } } } });
    }
    if (query.foodCategoryIds?.length) {
      and.push({ foodCategories: { some: { foodCategoryId: { in: query.foodCategoryIds } } } });
    }
    for (const facilityId of query.facilityIds ?? []) {
      and.push({ facilities: { some: { facilityId } } });
    }
    if (query.classes?.length) and.push({ class: { in: query.classes } });
    // Healthy mode: only restaurants whose Healthy tag an admin approved.
    if (query.healthyOnly) and.push({ healthyStatus: 'APPROVED' });

    // Search words match restaurant, chain, type, cuisine and dish names,
    // forgiving Arabic spelling (see search-text.ts).
    const q = query.q ? foldSearchText(query.q) : '';
    if (q) {
      const ids = await this.restaurantsMatching(q);
      if (!ids.length) return null;
      and.push({ id: { in: ids } });
    }

    if (query.moodId) {
      const mood = await this.prisma.db.mood.findFirst({
        where: {
          id: query.moodId,
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
      });
      if (!mood) return null;
      if (mood.healthyOnly) and.push({ healthyStatus: 'APPROVED' });

      // A mood's rules: any value within a rule, every rule together
      // (e.g. "a grill OR a kebab place" AND "luxury OR upscale"). A rule
      // left empty doesn't narrow anything.
      if (mood.businessTypeIds.length) {
        and.push({ businessTypes: { some: { businessTypeId: { in: mood.businessTypeIds } } } });
      }
      if (mood.foodCategoryIds.length) {
        and.push({ foodCategories: { some: { foodCategoryId: { in: mood.foodCategoryIds } } } });
      }
      if (mood.facilityIds.length) and.push({ facilities: { some: { facilityId: { in: mood.facilityIds } } } });
      if (mood.classes.length) and.push({ class: { in: mood.classes } });
      if (mood.eventTypeIds.length) {
        and.push({
          events: {
            some: {
              eventTypeId: { in: mood.eventTypeIds },
              isActive: true,
              moderationStatus: { not: 'HIDDEN' },
              OR: [{ isRecurring: true }, { isRecurring: false, eventDate: { gte: now } }],
            },
          },
        });
      }
      afterMidnight = mood.openAfterMidnight;
    }

    return { where: { AND: and }, afterMidnight };
  }

  private async restaurantsMatching(folded: string): Promise<string[]> {
    const pattern = containsPattern(folded);
    const like = (column: string) => Prisma.sql`${foldSql(Prisma.raw(column))} LIKE ${pattern}`;
    const either = (alias: string) => Prisma.sql`(${like(`${alias}."nameEn"`)} OR ${like(`${alias}."nameAr"`)})`;
    const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM restaurants r
      LEFT JOIN restaurant_chains c ON c.id = r."chainId"
      WHERE r.status = 'APPROVED' AND r."publishStatus" = 'APPROVED' AND (
        ${either('r')}
        OR (c.id IS NOT NULL AND ${either('c')})
        OR EXISTS (
          SELECT 1 FROM restaurant_business_types rb JOIN business_types b ON b.id = rb."businessTypeId"
          WHERE rb."restaurantId" = r.id AND ${either('b')}
        )
        OR EXISTS (
          SELECT 1 FROM restaurant_food_categories rf JOIN food_categories f ON f.id = rf."foodCategoryId"
          WHERE rf."restaurantId" = r.id AND ${either('f')}
        )
        OR EXISTS (
          SELECT 1 FROM dishes d
          WHERE d."restaurantId" = r.id AND d."isActive" AND d."moderationStatus" <> 'HIDDEN' AND ${either('d')}
        )
      )
    `;
    return rows.map((r) => r.id);
  }

  private async restaurantsWithLiveOffer(ids: string[], now: Date): Promise<Set<string>> {
    const promotions = await this.prisma.db.promotion.findMany({
      where: { restaurantId: { in: ids }, isActive: true, status: { not: 'REJECTED' } },
      select: promotionScheduleSelect,
    });
    return new Set(promotions.filter((p) => isPromotionLiveNow(p, now)).map((p) => p.restaurantId));
  }

  private pointSql(point: { lat: number; lng: number }) {
    return Prisma.sql`ST_SetSRID(ST_MakePoint(${point.lng}::float8, ${point.lat}::float8), 4326)::geography`;
  }

  private radiusSql(options: RankOptions) {
    if (!options.point || options.radiusKm == null) return Prisma.empty;
    return Prisma.sql`AND ST_DWithin(r.location, ${this.pointSql(options.point)}, ${options.radiusKm * 1000}::float8)`;
  }

  private async countWithinRadius(ids: string[], options: RankOptions): Promise<number> {
    if (!options.point || options.radiusKm == null) return ids.length;
    const rows = await this.prisma.db.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM restaurants r WHERE r.id = ANY(${ids}::text[]) ${this.radiusSql(options)}
    `;
    return rows[0]?.total ?? 0;
  }

  // One page of ids in display order, plus the numbers that decide that
  // order (featured, rating, distance) so the cards don't recompute them.
  private rank(ids: string[], options: RankOptions): Promise<RankRow[]> {
    const { point, now } = options;
    const distance = point ? Prisma.sql`ST_Distance(r.location, ${this.pointSql(point)})` : Prisma.sql`NULL`;
    const score = Prisma.raw(
      `(COALESCE(rv.cnt, 0) * COALESCE(rv.avg, 0) + ${PRIOR_WEIGHT} * ${PRIOR_MEAN}) / (COALESCE(rv.cnt, 0) + ${PRIOR_WEIGHT})`,
    );
    const orderBy = {
      recommended: Prisma.sql`"isFeatured" DESC, score DESC, r."createdAt" DESC`,
      rating: Prisma.sql`score DESC, "reviewCount" DESC, r."createdAt" DESC`,
      nearest: Prisma.sql`"distanceMeters" ASC NULLS LAST, score DESC`,
      newest: Prisma.sql`r."createdAt" DESC`,
    }[options.sort];

    return this.prisma.db.$queryRaw<RankRow[]>`
      SELECT
        r.id,
        EXISTS (
          SELECT 1 FROM featured_placements fp
          WHERE fp."restaurantId" = r.id AND fp.status = 'APPROVED' AND fp."isActive"
            AND (fp."startDate" IS NULL OR fp."startDate" <= ${now})
            AND (fp."endDate" IS NULL OR fp."endDate" >= ${now})
        ) AS "isFeatured",
        rv.avg AS rating,
        COALESCE(rv.cnt, 0) AS "reviewCount",
        ${distance}::float8 AS "distanceMeters",
        ${score} AS score
      FROM restaurants r
      LEFT JOIN (
        SELECT "restaurantId", AVG(rating)::float8 AS avg, COUNT(*)::int AS cnt
        FROM reviews
        WHERE "moderationStatus" <> 'HIDDEN' AND "restaurantId" = ANY(${ids}::text[])
        GROUP BY "restaurantId"
      ) rv ON rv."restaurantId" = r.id
      WHERE r.id = ANY(${ids}::text[]) ${this.radiusSql(options)}
      ORDER BY ${orderBy}, r.id
      LIMIT ${options.take} OFFSET ${options.skip}
    `;
  }

  private async toCards(rows: RankRow[], now: Date): Promise<RestaurantCard[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [restaurants, minPrices, withOffer] = await Promise.all([
      this.prisma.db.restaurant.findMany({ where: { id: { in: ids } }, select: cardSelect }),
      this.prisma.db.dish.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: ids }, isActive: true, moderationStatus: { not: 'HIDDEN' } },
        _min: { price: true },
      }),
      this.restaurantsWithLiveOffer(ids, now),
    ]);
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    const priceFrom = new Map(minPrices.map((p) => [p.restaurantId, p._min.price]));

    return rows.flatMap((row) => {
      const r = byId.get(row.id);
      if (!r) return [];
      const minPrice = priceFrom.get(r.id);
      return [
        {
          id: r.id,
          nameEn: r.nameEn,
          nameAr: r.nameAr,
          logoUrl: r.logoUrl,
          coverPhotoUrl: r.galleryPhotos[0]?.url ?? null,
          class: r.class,
          isVerified: r.isVerified,
          isHealthy: r.healthyStatus === 'APPROVED',
          isFeatured: row.isFeatured,
          latitude: r.latitude != null ? Number(r.latitude) : null,
          longitude: r.longitude != null ? Number(r.longitude) : null,
          distanceKm: row.distanceMeters != null ? Math.round(row.distanceMeters / 100) / 10 : null,
          rating: row.rating != null ? Math.round(row.rating * 10) / 10 : null,
          reviewCount: Number(row.reviewCount),
          priceFrom: minPrice != null ? Number(minPrice) : null,
          hasOffer: withOffer.has(r.id),
          isOpenNow: isOpenAt(r.openingHours, now),
          province: r.province,
          district: r.district,
          chain: r.chain,
          businessTypes: r.businessTypes.map((b) => b.businessType),
          foodCategories: r.foodCategories.map((f) => f.foodCategory),
        },
      ];
    });
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
