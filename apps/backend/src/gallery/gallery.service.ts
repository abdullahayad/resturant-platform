import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateGalleryPhotoDto, ModerateGalleryPhotoDto } from './dto/gallery-photo.dto';
import type { GalleryAlbumValue } from '../common/gallery';
import type { ModerationStatusValue } from '../common/moderation';
import { pageOffset } from '../common/pagination';
import { Prisma, type AmbienceSubCategory } from '../../generated/prisma/client';

const photoInclude = {
  dish: { select: { id: true, nameEn: true, isMostOrdered: true, menuCategory: true } },
} as const;

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    restaurantId: string,
    album?: GalleryAlbumValue,
    filters?: { mostOrdered?: boolean; menuCategoryId?: string; ambienceSubCategory?: AmbienceSubCategory },
    pageParam?: number,
  ) {
    const where: Prisma.GalleryPhotoWhereInput = {
      restaurantId,
      album,
      moderationStatus: { not: 'HIDDEN' },
      ambienceSubCategory: filters?.ambienceSubCategory,
      dish:
        filters?.mostOrdered || filters?.menuCategoryId
          ? { isMostOrdered: filters?.mostOrdered || undefined, menuCategoryId: filters?.menuCategoryId }
          : undefined,
    };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.galleryPhoto.findMany({
        where,
        include: photoInclude,
        orderBy: [{ isCover: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.db.galleryPhoto.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
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

  // Toggles cover on/off - setting a new cover atomically clears any other
  // cover in the same (restaurant, album), which is what actually keeps
  // "at most one cover per album" true, since that's not something a DB
  // constraint enforces here (see the isCover field comment in schema.prisma).
  async setCover(restaurantId: string, id: string, cover: boolean) {
    const photo = await this.prisma.db.galleryPhoto.findUnique({
      where: { id },
      select: { restaurantId: true, album: true },
    });
    if (!photo || photo.restaurantId !== restaurantId) throw new NotFoundException('Photo not found');

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        if (cover) {
          await tx.galleryPhoto.updateMany({
            where: { restaurantId, album: photo.album, isCover: true },
            data: { isCover: false },
          });
        }
        return tx.galleryPhoto.update({ where: { id }, data: { isCover: cover }, include: photoInclude });
      });
    } catch (err) {
      // The partial unique index (one cover per restaurantId+album) is the
      // real backstop for this - two near-simultaneous setCover(true) calls
      // in the same album can still both reach this transaction, and now
      // exactly one of them loses here instead of both silently succeeding.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Another photo was just set as the cover for this album - try again');
      }
      throw err;
    }
  }

  // ── Admin moderation ─────────────────────────────────────────────────

  async adminList(status?: ModerationStatusValue, pageParam?: number) {
    const where = { moderationStatus: status };
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.galleryPhoto.findMany({
        where,
        include: { ...photoInclude, restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.galleryPhoto.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  async moderate(id: string, dto: ModerateGalleryPhotoDto) {
    const photo = await this.prisma.db.galleryPhoto.findUnique({ where: { id }, select: { id: true } });
    if (!photo) throw new NotFoundException('Photo not found');
    return this.prisma.db.galleryPhoto.update({
      where: { id },
      data: { moderationStatus: dto.status },
      include: photoInclude,
    });
  }
}
