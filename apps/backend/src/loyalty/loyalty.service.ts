import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';
import type { CreateLoyaltyTierDto, UpdateLoyaltyTierDto } from './dto/loyalty-tier.dto';
import type { GrantLoyaltyRewardDto } from './dto/loyalty-reward.dto';

// Only these two booking statuses count toward a guest's loyalty total —
// PENDING hasn't actually happened yet and CANCELLED never did.
const QUALIFYING_STATUSES = ['CONFIRMED', 'COMPLETED'] as const;

const rewardInclude = {
  issuedBy: { select: { fullName: true } },
} as const;

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tier configuration ──────────────────────────────────────────────

  tiers() {
    return this.prisma.db.loyaltyTier.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  private activeTiers() {
    return this.prisma.db.loyaltyTier.findMany({ where: { isActive: true }, orderBy: { thresholdCount: 'asc' } });
  }

  async createTier(dto: CreateLoyaltyTierDto) {
    return this.prisma.db.loyaltyTier.create({ data: dto });
  }

  async updateTier(id: string, dto: UpdateLoyaltyTierDto) {
    const tier = await this.prisma.db.loyaltyTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Tier not found');
    return this.prisma.db.loyaltyTier.update({ where: { id }, data: dto });
  }

  // ── Guest lookup ─────────────────────────────────────────────────────

  private async qualifyingBookings(phone: string) {
    return this.prisma.db.chefTableBooking.findMany({
      where: { guestPhoneNormalized: phone, status: { in: [...QUALIFYING_STATUSES] } },
      select: {
        restaurantId: true,
        restaurant: { select: { id: true, nameEn: true, nameAr: true, codeNumber: true } },
      },
      orderBy: { reservationDate: 'desc' },
    });
  }

  private async currentTierForCount(count: number) {
    const tiers = await this.activeTiers();
    // Tiers are ascending by threshold — the guest's current tier is the
    // highest one they qualify for, so walk from the top down.
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (count >= tiers[i].thresholdCount) return tiers[i];
    }
    return null;
  }

  async guestLookup(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    const bookings = await this.qualifyingBookings(phone);
    const count = bookings.length;
    const currentTier = await this.currentTierForCount(count);

    const seen = new Set<string>();
    const restaurantsVisited = bookings
      .filter((b) => {
        if (seen.has(b.restaurantId)) return false;
        seen.add(b.restaurantId);
        return true;
      })
      .map((b) => b.restaurant);

    const rewards = await this.prisma.db.loyaltyReward.findMany({
      where: { guestPhone: phone },
      include: rewardInclude,
      orderBy: { issuedAt: 'desc' },
    });

    return {
      phone,
      qualifyingBookingCount: count,
      restaurantsVisited,
      currentTier: currentTier ? { id: currentTier.id, labelEn: currentTier.labelEn, labelAr: currentTier.labelAr } : null,
      rewards,
    };
  }

  // ── Reward issuance ──────────────────────────────────────────────────

  async grant(adminId: string, dto: GrantLoyaltyRewardDto) {
    const phone = normalizePhone(dto.guestPhone);
    const tier = await this.prisma.db.loyaltyTier.findUnique({ where: { id: dto.tierId } });
    if (!tier) throw new NotFoundException('Tier not found');

    const existing = await this.prisma.db.loyaltyReward.findUnique({
      where: { guestPhone_tierId: { guestPhone: phone, tierId: tier.id } },
    });
    if (existing) throw new BadRequestException('This guest has already been issued this tier reward');

    const bookings = await this.qualifyingBookings(phone);
    return this.prisma.db.loyaltyReward.create({
      data: {
        guestPhone: phone,
        tierId: tier.id,
        tierLabelEn: tier.labelEn,
        tierLabelAr: tier.labelAr,
        rewardEn: tier.rewardEn,
        rewardAr: tier.rewardAr,
        bookingCountAtIssuance: bookings.length,
        issuedById: adminId,
      },
      include: rewardInclude,
    });
  }

  async redeem(id: string) {
    const reward = await this.prisma.db.loyaltyReward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.redeemedAt) throw new BadRequestException('This reward has already been redeemed');
    return this.prisma.db.loyaltyReward.update({
      where: { id },
      data: { redeemedAt: new Date() },
      include: rewardInclude,
    });
  }

  // ── Called from EventsService after a booking is confirmed/completed ──
  // Fire-and-forget from the caller — never let a loyalty hiccup affect a
  // real booking-status update.
  async maybeAutoIssue(guestPhoneNormalized: string) {
    const bookings = await this.qualifyingBookings(guestPhoneNormalized);
    const count = bookings.length;
    const tiers = await this.activeTiers();
    const crossed = tiers.filter((t) => count >= t.thresholdCount);
    if (crossed.length === 0) return;

    const already = await this.prisma.db.loyaltyReward.findMany({
      where: { guestPhone: guestPhoneNormalized, tierId: { in: crossed.map((t) => t.id) } },
      select: { tierId: true },
    });
    const alreadyIssued = new Set(already.map((r) => r.tierId));

    for (const tier of crossed) {
      if (alreadyIssued.has(tier.id)) continue;
      await this.prisma.db.loyaltyReward.create({
        data: {
          guestPhone: guestPhoneNormalized,
          tierId: tier.id,
          tierLabelEn: tier.labelEn,
          tierLabelAr: tier.labelAr,
          rewardEn: tier.rewardEn,
          rewardAr: tier.rewardAr,
          bookingCountAtIssuance: count,
          issuedById: null,
        },
      });
    }
  }

  // ── Batched lookup for the partner-app reservations list ─────────────
  // Avoids one query per row when a restaurant's reservation list renders.
  async currentTiersForPhones(phones: string[]): Promise<Map<string, { labelEn: string; labelAr: string } | null>> {
    const unique = [...new Set(phones)];
    if (unique.length === 0) return new Map();

    const tiers = await this.activeTiers();
    const result = new Map<string, { labelEn: string; labelAr: string } | null>();
    if (tiers.length === 0) {
      unique.forEach((p) => result.set(p, null));
      return result;
    }

    const counts = await this.prisma.db.chefTableBooking.groupBy({
      by: ['guestPhoneNormalized'],
      where: { guestPhoneNormalized: { in: unique }, status: { in: [...QUALIFYING_STATUSES] } },
      _count: { _all: true },
    });
    const countByPhone = new Map(counts.map((c) => [c.guestPhoneNormalized, c._count._all]));

    for (const phone of unique) {
      const count = countByPhone.get(phone) ?? 0;
      let tier: (typeof tiers)[number] | null = null;
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (count >= tiers[i].thresholdCount) {
          tier = tiers[i];
          break;
        }
      }
      result.set(phone, tier ? { labelEn: tier.labelEn, labelAr: tier.labelAr } : null);
    }
    return result;
  }
}
