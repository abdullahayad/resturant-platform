import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStoryDto } from './dto/create-story.dto';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(restaurantId: string, dto: CreateStoryDto) {
    return this.prisma.db.story.create({
      data: {
        restaurantId,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        caption: dto.caption,
        expiresAt: new Date(Date.now() + ONE_DAY_MS),
      },
    });
  }

  active(restaurantId: string) {
    return this.prisma.db.story.findMany({
      where: { restaurantId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
