import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import type { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { pageOffset } from '../common/pagination';
import { hashReviewerPhone } from '../common/reviewerPhoneHash';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { isCritic } from '../customers/customer-levels';

const withReplyAndPhotos = {
  reply: true,
  photos: { select: { id: true, url: true, moderationStatus: true } },
} as const;

// `include` above adds relations on top of every scalar column by default -
// it does NOT narrow which scalar columns come back, so reviewerPhoneHash
// would otherwise ride along on every one of these responses. This is the
// one and only place that column is allowed to be excluded from, applied to
// every read path below - never select or include it directly instead.
// customerId is left out the same way: it's an internal account id, and
// reviews are shown publicly.
const omitPhoneHash = { reviewerPhoneHash: true, customerId: true } as const;

// How many AI reply-suggestion calls a restaurant can make in one day -
// this is the app's first paid external API call, so it's capped to keep a
// bug or a stuck retry loop from quietly running up a bill.
const DAILY_SUGGESTION_CAP = 30;

const REVIEW_PHONE_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFIED_VISIT_BEFORE_MS = 60 * DAY_MS;
const VERIFIED_VISIT_AFTER_MS = DAY_MS;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly anthropicKey = process.env.ANTHROPIC_API_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  // customerId: set when a signed-in customer writes it in the customer app.
  async createForRestaurant(restaurantId: string, dto: CreateReviewDto, customerId?: string) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true, notifyNewReview: true },
    });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      throw new BadRequestException('Restaurant is not open for reviews');
    }

    const reviewerPhoneHash = hashReviewerPhone(dto.reviewerPhone);
    const recentFromSamePhone = await this.prisma.db.review.findFirst({
      where: {
        restaurantId,
        reviewerPhoneHash,
        createdAt: { gte: new Date(Date.now() - REVIEW_PHONE_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    // A stable, translatable code rather than a human-readable English
    // sentence - the review page is bilingual and maps this to its own
    // localized copy rather than just displaying whatever this says.
    if (recentFromSamePhone) {
      throw new BadRequestException('review-cooldown-active');
    }

    const review = await this.prisma.db.review.create({
      data: {
        restaurantId,
        reviewerName: dto.reviewerName,
        reviewerPhoneHash,
        customerId,
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
    return this.prisma.db.review.findUnique({
      where: { id: review.id },
      include: withReplyAndPhotos,
      omit: omitPhoneHash,
    });
  }

  async listForRestaurant(restaurantId: string, pageParam?: number, rating?: number) {
    // moderationStatus exclusion moved here from a client-side filter in
    // CustomerReviewsScreen - same behavior, just now applied before
    // pagination instead of after fetching everything.
    const where = { restaurantId, moderationStatus: { not: 'HIDDEN' as const }, rating };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.review.findMany({
        where,
        include: withReplyAndPhotos,
        omit: omitPhoneHash,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.review.count({ where }),
    ]);
    const ids = items.map((r) => r.id);
    const [verified, extras] = await Promise.all([
      this.verifiedVisitReviewIds(restaurantId, ids),
      this.helpfulAndCritics(ids),
    ]);
    return {
      items: items.map((r) => ({
        ...r,
        verifiedVisit: verified.has(r.id),
        helpfulCount: extras.helpful.get(r.id) ?? 0,
        // Set only when the author is a public critic - their critic page
        // is public anyway; other authors' account ids never leave here.
        criticId: extras.critics.get(r.id) ?? null,
      })),
      total,
      page,
      pageSize: take,
    };
  }

  private async helpfulAndCritics(reviewIds: string[]) {
    const helpful = new Map<string, number>();
    const critics = new Map<string, string>();
    if (!reviewIds.length) return { helpful, critics };
    const rows = await this.prisma.db.review.findMany({
      where: { id: { in: reviewIds } },
      select: {
        id: true,
        _count: { select: { helpfulVotes: true } },
        customer: {
          select: {
            id: true,
            isPublic: true,
            criticHidden: true,
            isStar: true,
            blockedAt: true,
            _count: { select: { visits: true } },
          },
        },
      },
    });
    for (const r of rows) {
      helpful.set(r.id, r._count.helpfulVotes);
      if (r.customer && isCritic(r.customer, r.customer._count.visits)) critics.set(r.id, r.customer.id);
    }
    return { helpful, critics };
  }

  // "Verified visit": the reviewer's phone belongs to a customer-app account
  // whose visit code this restaurant scanned in the weeks around the review.
  // Matched on the one-way phone hash both sides store - the phone hash
  // itself is only read here and never returned.
  private async verifiedVisitReviewIds(restaurantId: string, reviewIds: string[]): Promise<Set<string>> {
    if (!reviewIds.length) return new Set();
    const reviews = await this.prisma.db.review.findMany({
      where: { id: { in: reviewIds }, reviewerPhoneHash: { not: null } },
      select: { id: true, reviewerPhoneHash: true, createdAt: true },
    });
    if (!reviews.length) return new Set();
    const customers = await this.prisma.db.customer.findMany({
      where: { phoneHash: { in: reviews.map((r) => r.reviewerPhoneHash!) } },
      select: { phoneHash: true, visits: { where: { restaurantId }, select: { createdAt: true } } },
    });
    const visitsByHash = new Map(customers.map((c) => [c.phoneHash, c.visits.map((v) => v.createdAt.getTime())]));
    return new Set(
      reviews
        .filter((r) => {
          const reviewed = r.createdAt.getTime();
          // A visit up to 60 days before the review, or the day after
          // (people sometimes review at the table, then get scanned).
          return (visitsByHash.get(r.reviewerPhoneHash) ?? []).some(
            (v) => v >= reviewed - VERIFIED_VISIT_BEFORE_MS && v <= reviewed + VERIFIED_VISIT_AFTER_MS,
          );
        })
        .map((r) => r.id),
    );
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
    const positiveSentimentPct = total ? Math.round((reviews.filter((r) => r.rating >= 4).length / total) * 100) : 0;

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

  async reply(restaurantId: string, reviewId: string, text: string, user: PartnerJwtPayload) {
    const review = await this.prisma.db.review.findUnique({ where: { id: reviewId }, select: { restaurantId: true } });
    if (!review || review.restaurantId !== restaurantId) throw new NotFoundException('Review not found');

    const existingReply = await this.prisma.db.reviewReply.findUnique({ where: { reviewId }, select: { text: true } });
    await this.prisma.db.reviewReply.upsert({
      where: { reviewId },
      create: { reviewId, text },
      update: { text },
    });
    await this.activityLog.log({
      restaurantId,
      section: 'reviews',
      summary: existingReply ? 'Updated reply to a review' : 'Replied to a review',
      changes:
        existingReply && existingReply.text !== text
          ? [{ field: 'Reply', from: existingReply.text, to: text }]
          : undefined,
      user,
    });
    return this.prisma.db.review.findUnique({
      where: { id: reviewId },
      include: withReplyAndPhotos,
      omit: omitPhoneHash,
    });
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
      throw new BadRequestException(
        `Daily limit of ${DAILY_SUGGESTION_CAP} AI suggestions reached - try again tomorrow`,
      );
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
      "If the rating is low, be empathetic and apologetic without making specific promises (no refunds, discounts, or guarantees - that is the owner's decision, not yours to offer).",
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
        omit: omitPhoneHash,
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
