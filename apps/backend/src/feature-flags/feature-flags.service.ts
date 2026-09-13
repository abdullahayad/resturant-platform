import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SetFeatureFlagOverrideDto } from './dto/feature-flag.dto';

const restaurantSummary = { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } } as const;
const provinceSummary = { select: { id: true, nameEn: true, nameAr: true } } as const;
const districtSummary = {
  select: { id: true, nameEn: true, nameAr: true, province: { select: { nameEn: true, nameAr: true } } },
} as const;
const overrideInclude = { restaurant: restaurantSummary, district: districtSummary, province: provinceSummary } as const;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Restaurant-facing ──────────────────────────────────────────────────

  // Resolution order, most specific wins: restaurant-specific override, then
  // district, then province ("city"), then the flag's own defaultEnabled. A
  // key with no FeatureFlag row at all (dashboard, profile, settings) never
  // reaches this — the partner-app treats those as always on.
  async resolveEnabledKeys(restaurantId: string): Promise<string[]> {
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { provinceId: true, districtId: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const flags = await this.prisma.db.featureFlag.findMany({
      include: {
        overrides: {
          where: {
            OR: [
              { restaurantId },
              ...(restaurant.districtId ? [{ districtId: restaurant.districtId }] : []),
              ...(restaurant.provinceId ? [{ provinceId: restaurant.provinceId }] : []),
            ],
          },
        },
      },
    });

    return flags
      .filter((flag) => {
        const restaurantOverride = flag.overrides.find((o) => o.restaurantId === restaurantId);
        if (restaurantOverride) return restaurantOverride.enabled;

        const districtOverride = restaurant.districtId
          ? flag.overrides.find((o) => o.districtId === restaurant.districtId)
          : undefined;
        if (districtOverride) return districtOverride.enabled;

        const provinceOverride = restaurant.provinceId
          ? flag.overrides.find((o) => o.provinceId === restaurant.provinceId)
          : undefined;
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
          include: overrideInclude,
          orderBy: { createdAt: 'desc' },
        },
      },
      // Flags currently off by default surface first — those are the ones
      // mid-rollout and needing attention, not the ones already fully live.
      orderBy: [{ defaultEnabled: 'asc' }, { key: 'asc' }],
    });
  }

  async updateDefault(id: string, defaultEnabled: boolean) {
    const flag = await this.prisma.db.featureFlag.findUnique({ where: { id }, select: { id: true } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return this.prisma.db.featureFlag.update({ where: { id }, data: { defaultEnabled } });
  }

  async setOverride(featureFlagId: string, dto: SetFeatureFlagOverrideDto) {
    const targetCount = [dto.restaurantId, dto.districtId, dto.provinceId].filter(Boolean).length;
    if (targetCount !== 1) {
      throw new BadRequestException('Provide exactly one of restaurantId, districtId, or provinceId');
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
        include: overrideInclude,
      });
    }
    if (dto.districtId) {
      return this.prisma.db.featureFlagOverride.upsert({
        where: { featureFlagId_districtId: { featureFlagId, districtId: dto.districtId } },
        update: { enabled: dto.enabled },
        create: { featureFlagId, districtId: dto.districtId, enabled: dto.enabled },
        include: overrideInclude,
      });
    }
    return this.prisma.db.featureFlagOverride.upsert({
      where: { featureFlagId_provinceId: { featureFlagId, provinceId: dto.provinceId! } },
      update: { enabled: dto.enabled },
      create: { featureFlagId, provinceId: dto.provinceId!, enabled: dto.enabled },
      include: overrideInclude,
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
