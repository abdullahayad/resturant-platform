import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStoryDto } from './dto/create-story.dto';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  async create(restaurantId: string, dto: CreateStoryDto, user: PartnerJwtPayload) {
    const story = await this.prisma.db.story.create({
      data: {
        restaurantId,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        caption: dto.caption,
        expiresAt: new Date(Date.now() + ONE_DAY_MS),
      },
    });
    await this.activityLog.log({ restaurantId, section: 'profile', summary: 'Posted a story photo', user });
    return story;
  }

  active(restaurantId: string) {
    return this.prisma.db.story.findMany({
      where: { restaurantId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
