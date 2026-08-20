import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { GrantFeaturedDto, ModerateFeaturedDto, RequestFeaturedDto } from './dto/featured.dto';

const restaurantSummary = { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } as const;

interface FeaturedLike {
  status: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

function isCurrentlyFeatured(p: FeaturedLike): boolean {
  if (p.status !== 'APPROVED' || !p.isActive) return false;
  const now = new Date();
  if (p.startDate && p.startDate > now) return false;
  if (p.endDate && p.endDate < now) return false;
  return true;
}

@Injectable()
export class FeaturedService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Restaurant-facing ──────────────────────────────────────────────────

  async listForRestaurant(restaurantId: string) {
    const placements = await this.prisma.db.featuredPlacement.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
    return placements.map((p) => ({ ...p, isCurrentlyActive: isCurrentlyFeatured(p) }));
  }

  async request(restaurantId: string, dto: RequestFeaturedDto) {
    const existingPending = await this.prisma.db.featuredPlacement.findFirst({
      where: { restaurantId, status: 'PENDING' },
      select: { id: true },
    });
    if (existingPending) {
      throw new ConflictException('You already have a featured placement request awaiting review');
    }

    return this.prisma.db.featuredPlacement.create({
      data: {
        restaurantId,
        initiator: 'RESTAURANT',
        reason: dto.reason,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async cancel(restaurantId: string, id: string) {
    const placement = await this.ensureOwnership(restaurantId, id);
    if (placement.status !== 'PENDING') {
      throw new BadRequestException('Only a pending request can be withdrawn');
    }
    await this.prisma.db.featuredPlacement.delete({ where: { id } });
    return { id };
  }

  private async ensureOwnership(restaurantId: string, id: string) {
    const placement = await this.prisma.db.featuredPlacement.findUnique({ where: { id } });
    if (!placement || placement.restaurantId !== restaurantId) {
      throw new NotFoundException('Featured placement not found');
    }
    return placement;
  }

  // ── Admin-facing ──────────────────────────────────────────────────────

  async adminList(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const placements = await this.prisma.db.featuredPlacement.findMany({
      where: { status },
      include: { restaurant: restaurantSummary, reviewedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return placements.map((p) => ({ ...p, isCurrentlyActive: isCurrentlyFeatured(p) }));
  }

  async grant(adminId: string, dto: GrantFeaturedDto) {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: dto.restaurantId },
      select: { id: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prisma.db.featuredPlacement.create({
      data: {
        restaurantId: dto.restaurantId,
        initiator: 'ADMIN',
        note: dto.note,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: 'APPROVED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: { restaurant: restaurantSummary },
    });
  }

  async moderate(adminId: string, id: string, dto: ModerateFeaturedDto) {
    const placement = await this.prisma.db.featuredPlacement.findUnique({ where: { id }, select: { id: true } });
    if (!placement) throw new NotFoundException('Featured placement not found');

    return this.prisma.db.featuredPlacement.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === 'REJECTED' ? (dto.rejectionReason ?? null) : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { restaurant: restaurantSummary },
    });
  }

  async revoke(id: string) {
    const placement = await this.prisma.db.featuredPlacement.findUnique({ where: { id }, select: { id: true } });
    if (!placement) throw new NotFoundException('Featured placement not found');
    return this.prisma.db.featuredPlacement.update({
      where: { id },
      data: { isActive: false },
      include: { restaurant: restaurantSummary },
    });
  }
}
