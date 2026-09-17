import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePromotionDto, ModeratePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { pageOffset } from '../common/pagination';
import { isPromotionLiveNow, type PromotionForPricing } from './promotion-pricing';

const promotionInclude = {
  dishes: { include: { dish: { select: { id: true, nameEn: true, nameAr: true, price: true } } } },
  reviewedBy: { select: { fullName: true } },
} as const;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(restaurantId: string, pageParam?: number) {
    const where = { restaurantId };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.promotion.findMany({ where, include: promotionInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.db.promotion.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async rejectedCount(restaurantId: string) {
    const count = await this.prisma.db.promotion.count({ where: { restaurantId, status: 'REJECTED' } });
    return { count };
  }

  // Bookkeeping only - no view/click/redemption tracking exists anywhere
  // for promotions (there's no customer app yet to generate that), so this
  // is deliberately scoped to what's actually knowable today: how many
  // promotions this restaurant has run and how they've fared in review.
  async summary(restaurantId: string) {
    const [total, pending, approved, rejected, activeNow, percentage, fixedAmount] = await Promise.all([
      this.prisma.db.promotion.count({ where: { restaurantId } }),
      this.prisma.db.promotion.count({ where: { restaurantId, status: 'PENDING' } }),
      this.prisma.db.promotion.count({ where: { restaurantId, status: 'APPROVED' } }),
      this.prisma.db.promotion.count({ where: { restaurantId, status: 'REJECTED' } }),
      this.prisma.db.promotion.count({ where: { restaurantId, status: 'APPROVED', isActive: true } }),
      this.prisma.db.promotion.count({ where: { restaurantId, discountType: 'PERCENTAGE' } }),
      this.prisma.db.promotion.count({ where: { restaurantId, discountType: 'FIXED_AMOUNT' } }),
    ]);
    return {
      total,
      byStatus: { PENDING: pending, APPROVED: approved, REJECTED: rejected },
      activeNow,
      byDiscountType: { PERCENTAGE: percentage, FIXED_AMOUNT: fixedAmount },
    };
  }

  async create(restaurantId: string, dto: CreatePromotionDto) {
    this.assertDiscountValue(dto.discountType, dto.discountValue);
    if (dto.scope === 'SPECIFIC_DISHES') {
      await this.assertDishesBelongToRestaurant(restaurantId, dto.dishIds ?? []);
    }

    return this.prisma.db.promotion.create({
      data: {
        restaurantId,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        photoUrl: dto.photoUrl,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        scope: dto.scope,
        // Live immediately - no admin approval wait (see the status field's
        // comment in schema.prisma).
        status: 'APPROVED',
        isRecurring: dto.isRecurring,
        validFrom: dto.isRecurring ? null : dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.isRecurring ? null : dto.validUntil ? new Date(dto.validUntil) : null,
        recurringDayOfWeek: dto.isRecurring ? dto.recurringDayOfWeek : null,
        startTime: dto.isRecurring ? dto.startTime : null,
        endTime: dto.isRecurring ? dto.endTime : null,
        dishes:
          dto.scope === 'SPECIFIC_DISHES' && dto.dishIds
            ? { create: dto.dishIds.map((dishId) => ({ dishId })) }
            : undefined,
      },
      include: promotionInclude,
    });
  }

  async update(restaurantId: string, id: string, dto: UpdatePromotionDto) {
    const existing = await this.ensureOwnership(restaurantId, id);

    const effectiveType = dto.discountType ?? existing.discountType;
    const effectiveValue = dto.discountValue ?? Number(existing.discountValue);
    if (dto.discountType !== undefined || dto.discountValue !== undefined) {
      this.assertDiscountValue(effectiveType, effectiveValue);
    }

    const effectiveScope = dto.scope ?? existing.scope;
    if (effectiveScope === 'SPECIFIC_DISHES' && dto.dishIds) {
      await this.assertDishesBelongToRestaurant(restaurantId, dto.dishIds);
    }

    // No approval gate to reset here - edits go live immediately, same as
    // creation (see the status field's comment in schema.prisma). An admin
    // can still take a promotion down via the moderate() endpoint below;
    // this edit path never touches status either way.
    return this.prisma.db.promotion.update({
      where: { id },
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        photoUrl: dto.photoUrl,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        scope: dto.scope,
        isActive: dto.isActive,
        ...(dto.isRecurring !== undefined
          ? {
              isRecurring: dto.isRecurring,
              validFrom: dto.isRecurring ? null : dto.validFrom ? new Date(dto.validFrom) : undefined,
              validUntil: dto.isRecurring ? null : dto.validUntil ? new Date(dto.validUntil) : undefined,
              recurringDayOfWeek: dto.isRecurring ? dto.recurringDayOfWeek : null,
              startTime: dto.isRecurring ? dto.startTime : null,
              endTime: dto.isRecurring ? dto.endTime : null,
            }
          : {
              validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
              validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
              recurringDayOfWeek: dto.recurringDayOfWeek,
              startTime: dto.startTime,
              endTime: dto.endTime,
            }),
        dishes: dto.dishIds ? { deleteMany: {}, create: dto.dishIds.map((dishId) => ({ dishId })) } : undefined,
      },
      include: promotionInclude,
    });
  }

  async remove(restaurantId: string, id: string) {
    await this.ensureOwnership(restaurantId, id);
    await this.prisma.db.promotion.delete({ where: { id } });
    return { id };
  }

  private async ensureOwnership(restaurantId: string, id: string) {
    const promotion = await this.prisma.db.promotion.findUnique({ where: { id } });
    if (!promotion || promotion.restaurantId !== restaurantId) throw new NotFoundException('Promotion not found');
    return promotion;
  }

  private assertDiscountValue(discountType: string, value: number) {
    if (discountType === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException('A percentage discount cannot exceed 100');
    }
  }

  private async assertDishesBelongToRestaurant(restaurantId: string, dishIds: string[]) {
    if (dishIds.length === 0) {
      throw new BadRequestException('Select at least one dish for a dish-specific promotion');
    }
    const owned = await this.prisma.db.dish.count({ where: { id: { in: dishIds }, restaurantId } });
    if (owned !== dishIds.length) {
      throw new BadRequestException('One or more selected dishes do not belong to this restaurant');
    }
  }

  // What a customer would actually see discounted right now - reused by
  // PreviewService (via DI, not duplicated) rather than each caller
  // re-deriving "is this promotion live" itself.
  async activePromotionsNow(restaurantId: string): Promise<PromotionForPricing[]> {
    const now = new Date();
    const promotions = await this.prisma.db.promotion.findMany({
      where: { restaurantId, isActive: true, status: { not: 'REJECTED' } },
      select: {
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
      },
    });
    return promotions.filter((p) => isPromotionLiveNow(p, now)).map((p) => ({ ...p, discountValue: Number(p.discountValue) }));
  }

  // ── Admin moderation ─────────────────────────────────────────────────

  async adminList(status?: 'PENDING' | 'APPROVED' | 'REJECTED', pageParam?: number) {
    const where = { status };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.promotion.findMany({
        where,
        include: {
          ...promotionInclude,
          restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.promotion.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async moderate(adminId: string, id: string, dto: ModeratePromotionDto) {
    const promotion = await this.prisma.db.promotion.findUnique({ where: { id }, select: { id: true } });
    if (!promotion) throw new NotFoundException('Promotion not found');

    return this.prisma.db.promotion.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === 'REJECTED' ? (dto.rejectionReason ?? null) : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: promotionInclude,
    });
  }
}
