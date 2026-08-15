import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGalleryPhotoDto } from './dto/gallery-photo.dto';

const photoInclude = {
  dish: { select: { id: true, nameEn: true, isMostOrdered: true, menuCategory: true } },
} as const;

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  list(restaurantId: string, album?: 'FOOD' | 'MENU' | 'AMBIENCE') {
    return this.prisma.db.galleryPhoto.findMany({
      where: { restaurantId, album },
      include: photoInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(restaurantId: string, dto: CreateGalleryPhotoDto) {
    if (dto.album === 'AMBIENCE' && !dto.ambienceSubCategory) {
      throw new BadRequestException('ambienceSubCategory is required for the Ambience album');
    }
    if (dto.album !== 'FOOD' && dto.dishId) {
      throw new BadRequestException('dishId is only valid for the Food album');
    }
    if (dto.album === 'FOOD' && dto.dishId) {
      const dish = await this.prisma.db.dish.findUnique({ where: { id: dto.dishId }, select: { restaurantId: true } });
      if (!dish || dish.restaurantId !== restaurantId) throw new NotFoundException('Dish not found');
    }

    return this.prisma.db.galleryPhoto.create({
      data: {
        restaurantId,
        album: dto.album,
        url: dto.url,
        caption: dto.caption,
        dishId: dto.album === 'FOOD' ? dto.dishId : undefined,
        ambienceSubCategory: dto.album === 'AMBIENCE' ? dto.ambienceSubCategory : undefined,
      },
      include: photoInclude,
    });
  }

  async remove(restaurantId: string, id: string) {
    const photo = await this.prisma.db.galleryPhoto.findUnique({ where: { id }, select: { restaurantId: true } });
    if (!photo || photo.restaurantId !== restaurantId) throw new NotFoundException('Photo not found');
    await this.prisma.db.galleryPhoto.delete({ where: { id } });
    return { id };
  }
}
