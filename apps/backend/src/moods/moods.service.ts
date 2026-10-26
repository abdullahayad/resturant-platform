import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMoodDto, UpdateMoodDto } from './dto/mood.dto';

@Injectable()
export class MoodsService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin view: every mood, switched on or not, in display order.
  list() {
    return this.prisma.db.mood.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  // Customer app view: only switched-on moods whose season (if any)
  // includes today.
  listActive(now = new Date()) {
    return this.prisma.db.mood.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateMoodDto) {
    this.checkDates(dto);
    // New moods go to the end of the list unless an order was given.
    const sortOrder =
      dto.sortOrder ?? ((await this.prisma.db.mood.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
    return this.prisma.db.mood.create({ data: { ...dto, sortOrder } });
  }

  async update(id: string, dto: UpdateMoodDto) {
    await this.ensureExists(id);
    this.checkDates(dto);
    return this.prisma.db.mood.update({ where: { id }, data: dto });
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.db.mood.update({ where: { id }, data: { isActive } });
  }

  // Saves a whole new order at once (the admin page sends every id in its
  // new position after a move up/down), so positions never collide.
  async reorder(ids: string[]) {
    await this.prisma.db.$transaction(
      ids.map((id, index) => this.prisma.db.mood.update({ where: { id }, data: { sortOrder: index + 1 } })),
    );
    return this.list();
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.db.mood.delete({ where: { id } });
    return { id };
  }

  private checkDates(dto: CreateMoodDto) {
    if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
      throw new BadRequestException('The season must end after it starts');
    }
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.mood.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Mood not found');
  }
}
