import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import type { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import type { ModerationStatusValue } from '../common/moderation';

const withReplyAndPhotos = {
  reply: true,
  photos: { select: { id: true, url: true, moderationStatus: true } },
} as const;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async createForRestaurant(restaurantId: string, dto: CreateReviewDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true, notifyNewReview: true },
    });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      throw new BadRequestException('Restaurant is not open for reviews');
    }
    const review = await this.prisma.db.review.create({
      data: {
        restaurantId,
        reviewerName: dto.reviewerName,
        rating: dto.rating,
        foodRating: dto.foodRating,
        serviceRating: dto.serviceRating,
        staffRating: dto.staffRating,
        ambienceRating: dto.ambienceRating,
        text: dto.text,
      },
    });

    if (dto.photoUrls?.length) {
      // Stored as regular gallery photos (album: REVIEW) rather than a
      // review-specific field — this way they show up in the restaurant's
      // own gallery and go through the exact same moderation flow as any
      // other photo, instead of a parallel one-off system.
      await this.prisma.db.galleryPhoto.createMany({
        data: dto.photoUrls.map((url) => ({
          restaurantId,
          album: 'REVIEW' as const,
          url,
          caption: dto.reviewerName,
          reviewId: review.id,
        })),
      });
    }

    if (restaurant.notifyNewReview) {
      this.push
        .sendToRestaurants([restaurantId], 'New review', `${dto.reviewerName} left a ${dto.rating}★ review`, {
          screen: 'reviews',
        })
        .catch(() => {});
    }
    return this.prisma.db.review.findUnique({ where: { id: review.id }, include: withReplyAndPhotos });
  }

  listForRestaurant(restaurantId: string) {
    return this.prisma.db.review.findMany({
      where: { restaurantId },
      include: withReplyAndPhotos,
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary(restaurantId: string) {
    const reviews = await this.prisma.db.review.findMany({
      where: { restaurantId, moderationStatus: { not: 'HIDDEN' } },
      select: {
        rating: true,
        foodRating: true,
        serviceRating: true,
        staffRating: true,
        ambienceRating: true,
        createdAt: true,
      },
    });

    const total = reviews.length;
    const overallAverage = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const positiveSentimentPct = total
      ? Math.round((reviews.filter((r) => r.rating >= 4).length / total) * 100)
      : 0;

    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => r.rating === star).length;
      return { star, count, pct: total ? Math.round((count / total) * 100) : 0 };
    });

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const categoryFields = [
      { key: 'food', field: 'foodRating', labelEn: 'Food', labelAr: 'الطعام' },
      { key: 'service', field: 'serviceRating', labelEn: 'Service', labelAr: 'الخدمة' },
      { key: 'staff', field: 'staffRating', labelEn: 'Staff', labelAr: 'الكادر والضيافة' },
      { key: 'ambience', field: 'ambienceRating', labelEn: 'Ambience', labelAr: 'الأجواء والديكور' },
    ] as const;

    const average = (rows: { value: number }[]) =>
      rows.length ? rows.reduce((sum, r) => sum + r.value, 0) / rows.length : null;

    const categoryScores = categoryFields.map(({ key, field, labelEn, labelAr }) => {
      const rated = reviews
        .filter((r) => r[field] != null)
        .map((r) => ({ value: r[field] as number, ageMs: now - r.createdAt.getTime() }));

      const overall = average(rated);
      const last30 = average(rated.filter((r) => r.ageMs <= 30 * DAY_MS));
      const prev30 = average(rated.filter((r) => r.ageMs > 30 * DAY_MS && r.ageMs <= 60 * DAY_MS));
      const trend = last30 != null && prev30 != null ? Number((last30 - prev30).toFixed(1)) : null;

      return {
        key,
        labelEn,
        labelAr,
        average: overall != null ? Number(overall.toFixed(1)) : null,
        trend,
      };
    });

    return {
      totalCount: total,
      overallAverage: Number(overallAverage.toFixed(1)),
      positiveSentimentPct,
      distribution,
      categoryScores,
    };
  }

  async reply(restaurantId: string, reviewId: string, text: string) {
    const review = await this.prisma.db.review.findUnique({ where: { id: reviewId }, select: { restaurantId: true } });
    if (!review || review.restaurantId !== restaurantId) throw new NotFoundException('Review not found');

    await this.prisma.db.reviewReply.upsert({
      where: { reviewId },
      create: { reviewId, text },
      update: { text },
    });
    return this.prisma.db.review.findUnique({ where: { id: reviewId }, include: withReplyAndPhotos });
  }

  listAll(status?: ModerationStatusValue) {
    return this.prisma.db.review.findMany({
      where: status ? { moderationStatus: status } : undefined,
      include: {
        ...withReplyAndPhotos,
        restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.db.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.db.review.update({ where: { id }, data: { moderationStatus: dto.status } });
  }
}
