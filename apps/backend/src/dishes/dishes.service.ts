import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDishDto, UpdateDishDto } from './dto/dish.dto';

const dishInclude = { menuCategory: true } as const;

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string) {
    return this.prisma.db.dish.findMany({
      where: { restaurantId, isActive: true },
      include: dishInclude,
      orderBy: { createdAt: 'desc' },
    });
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
}
