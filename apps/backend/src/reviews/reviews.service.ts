import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReviewDto, ModerateReviewDto } from './dto/review.dto';

const withReply = { reply: true } as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForRestaurant(restaurantId: string, dto: CreateReviewDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true },
    });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      throw new BadRequestException('Restaurant is not open for reviews');
    }
    return this.prisma.db.review.create({
      data: { restaurantId, reviewerName: dto.reviewerName, rating: dto.rating, text: dto.text },
      include: withReply,
    });
  }

  listForRestaurant(restaurantId: string) {
    return this.prisma.db.review.findMany({
      where: { restaurantId },
      include: withReply,
      orderBy: { createdAt: 'desc' },
    });
  }

  async reply(restaurantId: string, reviewId: string, text: string) {
    const review = await this.prisma.db.review.findUnique({ where: { id: reviewId }, select: { restaurantId: true } });
    if (!review || review.restaurantId !== restaurantId) throw new NotFoundException('Review not found');

    await this.prisma.db.reviewReply.upsert({
      where: { reviewId },
      create: { reviewId, text },
      update: { text },
    });
    return this.prisma.db.review.findUnique({ where: { id: reviewId }, include: withReply });
  }

  listAll(status?: 'VISIBLE' | 'FLAGGED' | 'HIDDEN') {
    return this.prisma.db.review.findMany({
      where: status ? { moderationStatus: status } : undefined,
      include: { ...withReply, restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.db.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.db.review.update({ where: { id }, data: { moderationStatus: dto.status } });
  }
}
