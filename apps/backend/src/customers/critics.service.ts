import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { pageOffset } from '../common/pagination';
import { isCritic, levelFor } from './customer-levels';

const criticSelect = {
  id: true,
  name: true,
  isPublic: true,
  criticHidden: true,
  isStar: true,
  blockedAt: true,
  specialtyIds: true,
  createdAt: true,
  _count: {
    select: { visits: true, reviews: { where: { moderationStatus: { not: 'HIDDEN' } } }, criticFollowers: true },
  },
} satisfies Prisma.CustomerSelect;

type CriticRow = Prisma.CustomerGetPayload<{ select: typeof criticSelect }>;

// Critics customers can follow, and "helpful" votes on reviews.
@Injectable()
export class CriticsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(specialtyId?: string) {
    const rows = await this.prisma.db.customer.findMany({
      where: {
        isPublic: true,
        criticHidden: false,
        blockedAt: null,
        ...(specialtyId ? { specialtyIds: { has: specialtyId } } : {}),
      },
      select: criticSelect,
    });
    const critics = rows.filter((c) => isCritic(c, c._count.visits));
    const shaped = await this.shape(critics);
    return shaped.sort(
      (a, b) => Number(b.isStar) - Number(a.isStar) || b.helpfulCount - a.helpfulCount || b.visitCount - a.visitCount,
    );
  }

  async profile(criticId: string, pageParam?: number) {
    const row = await this.prisma.db.customer.findUnique({ where: { id: criticId }, select: criticSelect });
    if (!row || !isCritic(row, row._count.visits)) throw new NotFoundException('Critic not found');
    const [critic] = await this.shape([row]);
    const { page, skip, take } = pageOffset(pageParam);
    const where = { customerId: criticId, moderationStatus: { not: 'HIDDEN' as const } };
    const reviews = await this.prisma.db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        restaurant: { select: { id: true, nameEn: true, nameAr: true, logoUrl: true } },
        photos: { where: { moderationStatus: { not: 'HIDDEN' } }, select: { id: true, url: true } },
        _count: { select: { helpfulVotes: true } },
      },
    });
    return {
      ...critic,
      reviews: reviews.map(({ _count, ...r }) => ({ ...r, helpfulCount: _count.helpfulVotes })),
      reviewsPage: page,
    };
  }

  async followedIds(customerId: string): Promise<string[]> {
    const rows = await this.prisma.db.criticFollow.findMany({
      where: { followerId: customerId },
      select: { criticId: true },
    });
    return rows.map((r) => r.criticId);
  }

  async follow(customerId: string, criticId: string) {
    if (customerId === criticId) throw new BadRequestException("You can't follow yourself");
    const row = await this.prisma.db.customer.findUnique({ where: { id: criticId }, select: criticSelect });
    if (!row || !isCritic(row, row._count.visits)) throw new NotFoundException('Critic not found');
    try {
      await this.prisma.db.criticFollow.create({ data: { followerId: customerId, criticId } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
    return { following: true };
  }

  async unfollow(customerId: string, criticId: string) {
    await this.prisma.db.criticFollow.deleteMany({ where: { followerId: customerId, criticId } });
    return { following: false };
  }

  // Tapping "helpful" again takes the vote back. Nobody can vote on their
  // own review.
  async toggleHelpful(customerId: string, reviewId: string) {
    const review = await this.prisma.db.review.findUnique({
      where: { id: reviewId },
      select: { customerId: true, moderationStatus: true },
    });
    if (!review || review.moderationStatus === 'HIDDEN') throw new NotFoundException('Review not found');
    if (review.customerId === customerId) throw new BadRequestException("You can't vote on your own review");
    const removed = await this.prisma.db.reviewHelpfulVote.deleteMany({ where: { reviewId, customerId } });
    if (removed.count === 0) {
      try {
        await this.prisma.db.reviewHelpfulVote.create({ data: { reviewId, customerId } });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    const count = await this.prisma.db.reviewHelpfulVote.count({ where: { reviewId } });
    return { helpful: removed.count === 0, count };
  }

  // Which reviews at this restaurant the customer already marked helpful.
  async helpfulIds(customerId: string, restaurantId: string): Promise<string[]> {
    const rows = await this.prisma.db.reviewHelpfulVote.findMany({
      where: { customerId, review: { restaurantId } },
      select: { reviewId: true },
    });
    return rows.map((r) => r.reviewId);
  }

  // Name, level, counts and specialty names for a set of critics.
  private async shape(rows: CriticRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [helpful, categories] = await Promise.all([
      this.prisma.db.review.findMany({
        where: { customerId: { in: ids }, moderationStatus: { not: 'HIDDEN' } },
        select: { customerId: true, _count: { select: { helpfulVotes: true } } },
      }),
      this.prisma.db.foodCategory.findMany({
        where: { id: { in: [...new Set(rows.flatMap((r) => r.specialtyIds))] } },
        select: { id: true, nameEn: true, nameAr: true, icon: true },
      }),
    ]);
    const helpfulBy = new Map<string, number>();
    for (const r of helpful) {
      if (r.customerId) helpfulBy.set(r.customerId, (helpfulBy.get(r.customerId) ?? 0) + r._count.helpfulVotes);
    }
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    return rows.map((r) => ({
      id: r.id,
      name: r.name ?? 'LiGETA',
      isStar: r.isStar,
      level: levelFor(r._count.visits).level,
      visitCount: r._count.visits,
      reviewCount: r._count.reviews,
      followerCount: r._count.criticFollowers,
      helpfulCount: helpfulBy.get(r.id) ?? 0,
      memberSince: r.createdAt,
      specialties: r.specialtyIds.flatMap((id) => {
        const c = categoryById.get(id);
        return c ? [c] : [];
      }),
    }));
  }
}
