import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SetFeatureFlagOverrideDto } from './dto/feature-flag.dto';

const restaurantSummary = { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } as const;
const provinceSummary = { select: { id: true, nameEn: true, nameAr: true } } as const;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Restaurant-facing ──────────────────────────────────────────────────

  // Resolution order: a restaurant-specific override wins outright; failing
  // that, a province-level override; failing that, the flag's own
  // defaultEnabled. A key with no FeatureFlag row at all (dashboard, profile,
  // settings) never reaches this — the partner-app treats those as always on.
  async resolveEnabledKeys(restaurantId: string): Promise<string[]> {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { provinceId: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const flags = await this.prisma.db.featureFlag.findMany({
      include: {
        overrides: {
          where: restaurant.provinceId
            ? { OR: [{ restaurantId }, { provinceId: restaurant.provinceId }] }
            : { restaurantId },
        },
      },
    });

    return flags
      .filter((flag) => {
        const restaurantOverride = flag.overrides.find((o) => o.restaurantId === restaurantId);
        if (restaurantOverride) return restaurantOverride.enabled;
        const provinceOverride = flag.overrides.find((o) => o.provinceId === restaurant.provinceId);
        if (provinceOverride) return provinceOverride.enabled;
        return flag.defaultEnabled;
      })
      .map((flag) => flag.key);
  }

  // ── Admin-facing ──────────────────────────────────────────────────────

  async adminList() {
    return this.prisma.db.featureFlag.findMany({
      include: {
        overrides: {
          include: { restaurant: restaurantSummary, province: provinceSummary },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { key: 'asc' },
    });
  }

  async updateDefault(id: string, defaultEnabled: boolean) {
    const flag = await this.prisma.db.featureFlag.findUnique({ where: { id }, select: { id: true } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return this.prisma.db.featureFlag.update({ where: { id }, data: { defaultEnabled } });
  }

  async setOverride(featureFlagId: string, dto: SetFeatureFlagOverrideDto) {
    if (!!dto.restaurantId === !!dto.provinceId) {
      throw new BadRequestException('Provide exactly one of restaurantId or provinceId');
    }
    const flag = await this.prisma.db.featureFlag.findUnique({ where: { id: featureFlagId }, select: { id: true } });
    if (!flag) throw new NotFoundException('Feature flag not found');

    // Upsert on the appropriate unique constraint — same pattern as
    // RestaurantsService.registerPushToken's token upsert. Prisma's `upsert`
    // needs a single compound-unique `where`, so pick the one that matches
    // whichever target was actually provided.
    if (dto.restaurantId) {
      return this.prisma.db.featureFlagOverride.upsert({
        where: { featureFlagId_restaurantId: { featureFlagId, restaurantId: dto.restaurantId } },
        update: { enabled: dto.enabled },
        create: { featureFlagId, restaurantId: dto.restaurantId, enabled: dto.enabled },
        include: { restaurant: restaurantSummary, province: provinceSummary },
      });
    }
    return this.prisma.db.featureFlagOverride.upsert({
      where: { featureFlagId_provinceId: { featureFlagId, provinceId: dto.provinceId! } },
      update: { enabled: dto.enabled },
      create: { featureFlagId, provinceId: dto.provinceId!, enabled: dto.enabled },
      include: { restaurant: restaurantSummary, province: provinceSummary },
    });
  }

  async removeOverride(overrideId: string) {
    const override = await this.prisma.db.featureFlagOverride.findUnique({
      where: { id: overrideId },
      select: { id: true },
    });
    if (!override) throw new NotFoundException('Override not found');
    await this.prisma.db.featureFlagOverride.delete({ where: { id: overrideId } });
    return { id: overrideId };
  }
}
