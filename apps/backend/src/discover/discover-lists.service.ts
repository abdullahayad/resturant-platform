import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { pageOffset, PAGE_SIZE, type Paginated } from '../common/pagination';
import { addDays, baghdadClock, weekdayOf } from '../common/baghdadTime';
import { computeDiscountedPrice, isPromotionLiveNow, type PromotionForPricing } from '../promotions/promotion-pricing';

export const DEFAULT_BUDGET_PRICE = 5000;

// Live = approved AND published - the same gate as Explore and the public
// restaurant page.
const LIVE_RESTAURANT = { status: 'APPROVED', publishStatus: 'APPROVED' } satisfies Prisma.RestaurantWhereInput;

// Just enough of a restaurant to label an offer, dish or event card and
// open its page.
const restaurantMiniSelect = {
  id: true,
  nameEn: true,
  nameAr: true,
  logoUrl: true,
  district: { select: { id: true, nameEn: true, nameAr: true } },
  galleryPhotos: {
    where: { moderationStatus: { not: 'HIDDEN' }, album: { in: ['FOOD', 'AMBIENCE'] } },
    orderBy: [{ isCover: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.RestaurantSelect;

type RestaurantMiniRow = Prisma.RestaurantGetPayload<{ select: typeof restaurantMiniSelect }>;

export interface RestaurantMini {
  id: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  district: { id: string; nameEn: string; nameAr: string } | null;
}

function toMini({ galleryPhotos, ...r }: RestaurantMiniRow): RestaurantMini {
  return { ...r, coverPhotoUrl: galleryPhotos[0]?.url ?? null };
}

const visibleDish = { isActive: true, moderationStatus: { not: 'HIDDEN' } } satisfies Prisma.DishWhereInput;

const pricingSelect = {
  restaurantId: true,
  scope: true,
  discountType: true,
  discountValue: true,
  isRecurring: true,
  validFrom: true,
  validUntil: true,
  recurringDayOfWeek: true,
  startTime: true,
  endTime: true,
  dishes: { select: { dishId: true } },
} satisfies Prisma.PromotionSelect;

function pageOf<T>(all: T[], pageParam?: number): Paginated<T> {
  const { page, skip, take } = pageOffset(pageParam);
  return { items: all.slice(skip, skip + take), total: all.length, page, pageSize: PAGE_SIZE };
}

// The Offers and Events tabs. Separate from DiscoverService (which ranks
// restaurants) because these list offers, dishes and events, each labelled
// with its restaurant.
@Injectable()
export class DiscoverListsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every offer a customer can still use: running now, coming up later
  // this week (recurring days), or a dated one that hasn't ended. The ones
  // running right now come first.
  async offers(pageParam: number | undefined, now = new Date()) {
    const rows = await this.prisma.db.promotion.findMany({
      where: {
        isActive: true,
        status: { not: 'REJECTED' },
        restaurant: LIVE_RESTAURANT,
        OR: [{ isRecurring: true }, { isRecurring: false, validUntil: { gte: now } }],
      },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        descriptionEn: true,
        descriptionAr: true,
        photoUrl: true,
        discountType: true,
        discountValue: true,
        scope: true,
        isRecurring: true,
        validFrom: true,
        validUntil: true,
        recurringDayOfWeek: true,
        startTime: true,
        endTime: true,
        dishes: {
          where: { dish: visibleDish },
          select: { dish: { select: { id: true, nameEn: true, nameAr: true, price: true, photoUrl: true } } },
        },
        restaurant: { select: restaurantMiniSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = rows
      // A dish-specific offer whose dishes have all been hidden or switched
      // off has nothing left to offer.
      .filter((p) => p.scope === 'WHOLE_MENU' || p.dishes.length > 0)
      .map(({ restaurant, dishes, discountValue, ...p }) => ({
        ...p,
        discountValue: Number(discountValue),
        liveNow: isPromotionLiveNow(p, now),
        dishes: dishes.map(({ dish }) => ({ ...dish, price: Number(dish.price) })),
        restaurant: toMini(restaurant),
      }))
      .sort((a, b) => Number(b.liveNow) - Number(a.liveNow));

    return pageOf(items, pageParam);
  }

  // "بـ5 آلاف وأقل": dishes listed at or under the price, cheapest first,
  // with today's discount applied when one is running.
  async budgetDishes(maxPrice = DEFAULT_BUDGET_PRICE, pageParam: number | undefined, now = new Date()) {
    const where = {
      ...visibleDish,
      price: { lte: maxPrice },
      restaurant: LIVE_RESTAURANT,
    } satisfies Prisma.DishWhereInput;
    const { page, skip, take } = pageOffset(pageParam);
    const [rows, total] = await Promise.all([
      this.prisma.db.dish.findMany({
        where,
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          price: true,
          photoUrl: true,
          menuCategory: { select: { id: true, nameEn: true, nameAr: true } },
          restaurant: { select: restaurantMiniSelect },
        },
        orderBy: [{ price: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.db.dish.count({ where }),
    ]);

    const promotions = await this.livePromotions(
      rows.map((d) => d.restaurant.id),
      now,
    );
    const items = rows.map(({ restaurant, price, ...dish }) => {
      const discounted = computeDiscountedPrice(Number(price), promotions.get(restaurant.id) ?? [], dish.id);
      return { ...dish, price: Number(price), discountedPrice: discounted, restaurant: toMini(restaurant) };
    });
    return { items, total, page, pageSize: take };
  }

  // Upcoming events across every live restaurant, each placed on its next
  // date (or on the chosen date). Dates and times are Baghdad's.
  async events(query: { date?: string; eventTypeId?: string; restaurantId?: string; page?: number }, now = new Date()) {
    const today = baghdadClock(now);
    const rows = await this.prisma.db.restaurantEvent.findMany({
      where: {
        isActive: true,
        moderationStatus: { not: 'HIDDEN' },
        eventTypeId: query.eventTypeId,
        restaurantId: query.restaurantId,
        restaurant: LIVE_RESTAURANT,
        // A one-off event stays listed for the whole of its day.
        OR: [{ isRecurring: true }, { isRecurring: false, eventDate: { gte: startOfBaghdadDay(today.date) } }],
      },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        descriptionEn: true,
        descriptionAr: true,
        photoUrl: true,
        price: true,
        capacity: true,
        isRecurring: true,
        eventDate: true,
        recurringDaysOfWeek: true,
        recurringTime: true,
        eventType: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
        restaurant: { select: restaurantMiniSelect },
      },
    });

    const items = rows
      .flatMap(({ restaurant, price, ...e }) => {
        const slot = e.isRecurring
          ? nextRecurringSlot(e.recurringDaysOfWeek, e.recurringTime, today, query.date)
          : oneOffSlot(e.eventDate, query.date);
        if (!slot) return [];
        return [
          {
            ...e,
            price: price != null ? Number(price) : null,
            ...slot,
            restaurant: toMini(restaurant),
          },
        ];
      })
      .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));

    return pageOf(items, query.page);
  }

  private async livePromotions(restaurantIds: string[], now: Date): Promise<Map<string, PromotionForPricing[]>> {
    const map = new Map<string, PromotionForPricing[]>();
    if (!restaurantIds.length) return map;
    const promotions = await this.prisma.db.promotion.findMany({
      where: { restaurantId: { in: [...new Set(restaurantIds)] }, isActive: true, status: { not: 'REJECTED' } },
      select: pricingSelect,
    });
    for (const p of promotions) {
      if (!isPromotionLiveNow(p, now)) continue;
      const list = map.get(p.restaurantId) ?? [];
      list.push({ ...p, discountValue: Number(p.discountValue) });
      map.set(p.restaurantId, list);
    }
    return map;
  }
}

// Baghdad midnight of a calendar day, as a real instant (21:00 UTC the day before).
function startOfBaghdadDay(date: string): Date {
  return new Date(`${date}T00:00:00+03:00`);
}

interface Slot {
  date: string; // Baghdad "YYYY-MM-DD"
  time: string | null; // Baghdad "HH:mm"
  // What to send as reservationDate when booking this occurrence - the
  // event's own timestamp for a one-off, the calendar day for a recurring
  // one (that's what EventsService.createReservation checks against).
  bookingDate: string;
}

function oneOffSlot(eventDate: Date | null, wanted?: string): Slot | null {
  if (!eventDate) return null;
  const { date, time } = baghdadClock(eventDate);
  if (wanted && wanted !== date) return null;
  return { date, time, bookingDate: eventDate.toISOString() };
}

// The next day this event happens on, from today - skipping today if its
// start time has already passed. With a chosen date, only that day counts.
function nextRecurringSlot(
  days: number[],
  time: string | null,
  today: { date: string; time: string },
  wanted?: string,
): Slot | null {
  if (!days.length) return null;
  if (wanted) {
    if (wanted < today.date || !days.includes(weekdayOf(wanted))) return null;
    return { date: wanted, time, bookingDate: wanted };
  }
  for (let offset = 0; offset < 8; offset++) {
    const date = addDays(today.date, offset);
    if (!days.includes(weekdayOf(date))) continue;
    if (offset === 0 && time && time < today.time) continue;
    return { date, time, bookingDate: date };
  }
  return null;
}
