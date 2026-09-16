import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_PRICE, type BulkUpdatePricesDto, type CreateDishDto, type ModerateDishDto, type PriceAdjustmentType, type UpdateDishDto } from './dto/dish.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { pageOffset } from '../common/pagination';

const dishInclude = { menuCategory: true } as const;

// Rounded to 2 decimals (Decimal(10,2) in the schema) and clamped to a
// sane range - never let a steep-enough percentage or fixed decrease push
// a price to zero or below, and never past the same cap CreateDishDto
// already enforces on a single dish.
function computeAdjustedPrice(currentPrice: number, type: PriceAdjustmentType, value: number): number {
  const raw = type === 'PERCENTAGE' ? currentPrice * (1 + value / 100) : currentPrice + value;
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(MAX_PRICE, Math.max(1, rounded));
}

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  // Full, unpaginated - see DishesController.list for why this stays as-is.
  list(restaurantId: string) {
    return this.prisma.db.dish.findMany({
      where: { restaurantId, isActive: true, moderationStatus: { not: 'HIDDEN' } },
      include: dishInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async browse(restaurantId: string, pageParam?: number) {
    const where = { restaurantId, isActive: true, moderationStatus: { not: 'HIDDEN' as const } };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.dish.findMany({ where, include: dishInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.db.dish.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  create(restaurantId: string, dto: CreateDishDto) {
    return this.prisma.db.dish.create({
      data: { restaurantId, ...dto },
      include: dishInclude,
    });
  }

  async update(restaurantId: string, dishId: string, dto: UpdateDishDto) {
    await this.ensureOwned(restaurantId, dishId);
    return this.prisma.db.dish.update({
      where: { id: dishId },
      data: dto,
      include: dishInclude,
    });
  }

  async remove(restaurantId: string, dishId: string) {
    await this.ensureOwned(restaurantId, dishId);
    await this.prisma.db.dish.update({ where: { id: dishId }, data: { isActive: false } });
    return { id: dishId };
  }

  // Applies a percentage or fixed-amount adjustment across either every
  // active dish or a specific subset - the frontend shows its own
  // before/after preview from the dishes it already has loaded, but the
  // actual new prices are always computed here from the current DB values,
  // not trusted from that preview (two staff editing at once, or a stale
  // screen, shouldn't be able to push a preview-computed price that no
  // longer matches reality).
  async bulkUpdatePrices(restaurantId: string, dto: BulkUpdatePricesDto) {
    if (dto.dishIds) {
      const owned = await this.prisma.db.dish.count({ where: { id: { in: dto.dishIds }, restaurantId } });
      if (owned !== dto.dishIds.length) {
        throw new BadRequestException('One or more selected dishes do not belong to this restaurant');
      }
    }

    const where = dto.dishIds ? { id: { in: dto.dishIds }, restaurantId } : { restaurantId, isActive: true };
    const dishes = await this.prisma.db.dish.findMany({ where, select: { id: true, price: true } });

    return this.prisma.db.$transaction((tx) =>
      Promise.all(
        dishes.map((dish) =>
          tx.dish.update({
            where: { id: dish.id },
            data: { price: computeAdjustedPrice(Number(dish.price), dto.type, dto.value) },
            include: dishInclude,
          }),
        ),
      ),
    );
  }

  private async ensureOwned(restaurantId: string, dishId: string) {
    const dish = await this.prisma.db.dish.findUnique({ where: { id: dishId }, select: { restaurantId: true } });
    if (!dish || dish.restaurantId !== restaurantId) {
      throw new NotFoundException('Dish not found');
    }
  }

  // ── Admin moderation ─────────────────────────────────────────────────

  async adminList(status?: ModerationStatusValue, pageParam?: number) {
    const where = { isActive: true, moderationStatus: status };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.dish.findMany({
        where,
        include: { ...dishInclude, restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.dish.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async moderate(id: string, dto: ModerateDishDto) {
    const dish = await this.prisma.db.dish.findUnique({ where: { id }, select: { id: true } });
    if (!dish) throw new NotFoundException('Dish not found');
    return this.prisma.db.dish.update({ where: { id }, data: { moderationStatus: dto.status }, include: dishInclude });
  }
}
