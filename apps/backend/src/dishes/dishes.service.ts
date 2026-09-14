import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDishDto, ModerateDishDto, UpdateDishDto } from './dto/dish.dto';
import type { ModerationStatusValue } from '../common/moderation';
import { pageOffset } from '../common/pagination';

const dishInclude = { menuCategory: true } as const;

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
