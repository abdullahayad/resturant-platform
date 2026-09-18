import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { PromotionsService } from '../promotions/promotions.service';
import { computeDiscountedPrice } from '../promotions/promotion-pricing';

// Everything a customer would actually be able to see, once a public app
// or listing exists to show it - each relation filtered exactly the way
// that section's own restaurant-facing "my X" list already filters it
// (dishes: isActive + not hidden, photos: not hidden, chef's signature
// dishes: not hidden either even though the chef profile itself carries no
// moderation status of its own). Events specifically reuse
// EventsService.publicList() rather than duplicating its filtering here,
// so this preview can never drift out of sync with what a real public
// listing would show for events.
const previewSelect = {
  id: true,
  nameEn: true,
  nameAr: true,
  codeNumber: true,
  phone: true,
  logoUrl: true,
  latitude: true,
  longitude: true,
  crewCount: true,
  crewPhotoUrl: true,
  province: { select: { nameEn: true, nameAr: true } },
  district: { select: { nameEn: true, nameAr: true } },
  chain: { select: { nameEn: true, nameAr: true } },
  businessTypes: { select: { businessType: { select: { nameEn: true, nameAr: true } } } },
  foodCategories: { select: { foodCategory: { select: { nameEn: true, nameAr: true } } } },
  facilities: { select: { facility: { select: { nameEn: true, nameAr: true } } } },
  openingHours: { orderBy: { dayOfWeek: 'asc' as const } },
  dishes: {
    where: { isActive: true, moderationStatus: { not: 'HIDDEN' as const } },
    include: { menuCategory: true },
    orderBy: { createdAt: 'desc' as const },
  },
  galleryPhotos: {
    where: { moderationStatus: { not: 'HIDDEN' as const } },
    orderBy: { createdAt: 'desc' as const },
  },
  chefProfiles: {
    include: {
      signatureDishes: {
        where: { dish: { isActive: true, moderationStatus: { not: 'HIDDEN' as const } } },
        include: { dish: { select: { id: true, nameEn: true, nameAr: true, photoUrl: true } } },
      },
    },
  },
  reviews: {
    where: { moderationStatus: { not: 'HIDDEN' as const } },
    select: { rating: true },
  },
} as const;

@Injectable()
export class PreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly promotions: PromotionsService,
  ) {}

  async get(restaurantId: string) {
    const [restaurant, events, activePromotions] = await Promise.all([
      this.prisma.db.restaurant.findUnique({ where: { id: restaurantId }, select: previewSelect }),
      this.events.publicList(restaurantId),
      this.promotions.activePromotionsNow(restaurantId),
    ]);
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const { reviews, dishes, ...rest } = restaurant;
    const totalReviews = reviews.length;
    const overallAverage = totalReviews ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : null;

    // Same discount a customer would actually see applied at checkout,
    // computed from whatever promotions are live right now - not a
    // separate "promotions" list of its own.
    const dishesWithPricing = dishes.map((dish) => {
      const discounted = computeDiscountedPrice(Number(dish.price), activePromotions, dish.id);
      return { ...dish, discountedPrice: discounted != null ? discounted.toFixed(2) : null };
    });

    return {
      ...rest,
      dishes: dishesWithPricing,
      events,
      overallAverage: overallAverage != null ? Number(overallAverage.toFixed(1)) : null,
      totalReviews,
    };
  }
}
