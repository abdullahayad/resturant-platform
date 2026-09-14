import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import type { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { pageOffset } from '../common/pagination';

const withReplyAndPhotos = {
  reply: true,
  photos: { select: { id: true, url: true, moderationStatus: true } },
} as const;

// How many AI reply-suggestion calls a restaurant can make in one day -
// this is the app's first paid external API call, so it's capped to keep a
// bug or a stuck retry loop from quietly running up a bill.
const DAILY_SUGGESTION_CAP = 30;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly anthropicKey = process.env.ANTHROPIC_API_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly featureFlags: FeatureFlagsService,
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

  async listForRestaurant(restaurantId: string, pageParam?: number, rating?: number) {
    // moderationStatus exclusion moved here from a client-side filter in
    // CustomerReviewsScreen - same behavior, just now applied before
    // pagination instead of after fetching everything.
    const where = { restaurantId, moderationStatus: { not: 'HIDDEN' as const }, rating };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.review.findMany({ where, include: withReplyAndPhotos, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.db.review.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  // Lightweight count for the sidebar's "new reviews" badge - see the
  // equivalent reservations/promotions/announcements counts for why this
  // exists as its own endpoint instead of reusing the (now paginated) list
  // above. "New" has no server-side concept of its own (unlike unread
  // announcements) - the app tracks when the owner last opened this screen
  // locally and asks "how many since then".
  async newCount(restaurantId: string, since: Date) {
    const count = await this.prisma.db.review.count({ where: { restaurantId, createdAt: { gt: since } } });
    return { count };
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

  // Drafts a reply with AI for the owner to edit and send themselves - never
  // posts anything on its own. Gated server-side by the "aiReviewReplies"
  // feature flag (not just hidden in the app UI, unlike most flags here)
  // because a call here costs real money, so it must not be reachable just
  // by calling the endpoint directly while the flag is off for a restaurant.
  async suggestReply(restaurantId: string, reviewId: string): Promise<{ suggestion: string }> {
    const enabledKeys = await this.featureFlags.resolveEnabledKeys(restaurantId);
    if (!enabledKeys.includes('aiReviewReplies')) {
      throw new ForbiddenException('AI reply suggestions are not enabled for this restaurant');
    }

    const review = await this.prisma.db.review.findUnique({
      where: { id: reviewId },
      select: { restaurantId: true, rating: true, text: true },
    });
    if (!review || review.restaurantId !== restaurantId) throw new NotFoundException('Review not found');

    // Atomic check-and-increment: only matches (and bumps the count) when
    // today's count is still under the cap, or it's a new day. If neither
    // holds, the UPDATE matches zero rows and rows comes back empty - the
    // row-level lock during this single statement is what actually prevents
    // two simultaneous requests from both slipping in as the 30th call.
    const rows = await this.prisma.db.$queryRaw<{ aiSuggestionCount: number }[]>`
      UPDATE restaurants
      SET "aiSuggestionCount" = CASE WHEN "aiSuggestionCountDate"::date = CURRENT_DATE THEN "aiSuggestionCount" + 1 ELSE 1 END,
          "aiSuggestionCountDate" = CURRENT_TIMESTAMP
      WHERE id = ${restaurantId}
        AND ("aiSuggestionCountDate"::date IS DISTINCT FROM CURRENT_DATE OR "aiSuggestionCount" < ${DAILY_SUGGESTION_CAP})
      RETURNING "aiSuggestionCount"
    `;
    if (rows.length === 0) {
      throw new BadRequestException(`Daily limit of ${DAILY_SUGGESTION_CAP} AI suggestions reached - try again tomorrow`);
    }

    if (!this.anthropicKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not set - cannot generate a suggestion.');
      throw new BadRequestException('AI reply suggestions are not configured yet');
    }

    const prompt = [
      'You are helping a restaurant owner write a short reply to a customer review on a food delivery/discovery app.',
      `Star rating: ${review.rating}/5.`,
      review.text ? `Review text: "${review.text}"` : 'The customer left no written text, only a star rating.',
      'Write ONE reply, under 60 words, warm and professional.',
      'If the rating is low, be empathetic and apologetic without making specific promises (no refunds, discounts, or guarantees - that is the owner\'s decision, not yours to offer).',
      'Reply in the same language as the review text (Arabic or English); if there is no text, reply in English.',
      'Output only the reply text itself, nothing else - no quotes, no labels.',
    ].join('\n');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        this.logger.error(`Anthropic suggest-reply failed: ${res.status} ${await res.text()}`);
        throw new BadRequestException('Could not generate a suggestion right now');
      }
      const data = (await res.json()) as { content?: { text?: string }[] };
      const suggestion = data.content?.[0]?.text?.trim();
      if (!suggestion) throw new BadRequestException('Could not generate a suggestion right now');
      return { suggestion };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Anthropic suggest-reply threw: ${err instanceof Error ? err.message : err}`);
      throw new BadRequestException('Could not generate a suggestion right now');
    }
  }

  async listAll(status?: ModerationStatusValue, pageParam?: number) {
    const where = status ? { moderationStatus: status } : undefined;
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.review.findMany({
        where,
        include: {
          ...withReplyAndPhotos,
          restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.review.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.db.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.db.review.update({ where: { id }, data: { moderationStatus: dto.status } });
  }
}
