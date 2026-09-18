import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateChainDto, UpdateChainDto } from './dto/chain.dto';

@Injectable()
export class ChainsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.restaurantChain.findMany({
      orderBy: { nameEn: 'asc' },
      include: { _count: { select: { restaurants: true } } },
    });
  }

  create(dto: CreateChainDto) {
    return this.prisma.db.restaurantChain.create({ data: { nameEn: dto.nameEn, nameAr: dto.nameAr } });
  }

  async update(id: string, dto: UpdateChainDto) {
    await this.ensureExists(id);
    return this.prisma.db.restaurantChain.update({ where: { id }, data: { nameEn: dto.nameEn, nameAr: dto.nameAr } });
  }

  // Restaurants linked to this chain are kept, just unlinked (chainId ->
  // null via the schema's onDelete: SetNull) - deleting a chain by mistake
  // never deletes a restaurant.
  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.db.restaurantChain.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.restaurantChain.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Chain not found');
  }
}
