import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { HomeBannerDto } from './home-banners.dto';

const order = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }];

// Seasonal / campaign banners on the customer app's Home, managed in
// Admin > App > Home Layout - same on/off + season-dates pattern as moods.
@Injectable()
export class HomeBannersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.homeBanner.findMany({ orderBy: order });
  }

  listActive(now = new Date()) {
    return this.prisma.db.homeBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: order,
    });
  }

  async create(dto: HomeBannerDto) {
    this.check(dto);
    const sortOrder =
      dto.sortOrder ??
      ((await this.prisma.db.homeBanner.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
    return this.prisma.db.homeBanner.create({ data: { ...dto, sortOrder } });
  }

  async update(id: string, dto: HomeBannerDto) {
    await this.ensureExists(id);
    this.check(dto);
    return this.prisma.db.homeBanner.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.db.homeBanner.delete({ where: { id } });
    return { id };
  }

  private check(dto: HomeBannerDto) {
    if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
      throw new BadRequestException('The banner must end after it starts');
    }
    if ((dto.linkType === 'RESTAURANT' || dto.linkType === 'MOOD') && !dto.linkValue) {
      throw new BadRequestException('Choose which restaurant or mood the banner opens');
    }
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.db.homeBanner.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Banner not found');
  }
}
