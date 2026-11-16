import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { baghdadClock } from '../common/baghdadTime';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

export interface StampProgress {
  stamps: number;
  visitsRequired: number;
  ready: boolean;
  rewardEn: string;
  rewardAr: string;
}

export const MIN_VISITS_REQUIRED = 2;
export const MAX_VISITS_REQUIRED = 20;

// A restaurant's stamp card: each verified visit (a scanned visit code,
// at most one a day) is a stamp; every N stamps earn the restaurant's
// reward, handed over by staff from the scan screen. Stamps count the
// visits after the customer's latest reward there. Separate from the
// admin's platform-wide loyalty tiers (src/loyalty), which count bookings.
@Injectable()
export class StampCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(restaurantId: string) {
    const card = await this.prisma.db.stampCard.findUnique({ where: { restaurantId } });
    return card ?? { restaurantId, isActive: false, visitsRequired: 5, rewardEn: '', rewardAr: '' };
  }

  async update(restaurantId: string, data: { isActive: boolean; visitsRequired: number; rewardEn: string; rewardAr: string }) {
    const rewardEn = data.rewardEn.trim();
    const rewardAr = data.rewardAr.trim();
    if (data.isActive && (!rewardEn || !rewardAr)) throw new BadRequestException('Write the reward in both languages');
    return this.prisma.db.stampCard.upsert({
      where: { restaurantId },
      create: { restaurantId, isActive: data.isActive, visitsRequired: data.visitsRequired, rewardEn, rewardAr },
      update: { isActive: data.isActive, visitsRequired: data.visitsRequired, rewardEn, rewardAr },
    });
  }

  // Public, for the restaurant page: what the card offers, or null.
  async publicCard(restaurantId: string) {
    const card = await this.prisma.db.stampCard.findUnique({ where: { restaurantId } });
    if (!card?.isActive) return null;
    return { visitsRequired: card.visitsRequired, rewardEn: card.rewardEn, rewardAr: card.rewardAr };
  }

  // One customer's progress at one restaurant; null when it has no card.
  async progress(customerId: string, restaurantId: string): Promise<StampProgress | null> {
    const card = await this.prisma.db.stampCard.findUnique({ where: { restaurantId } });
    if (!card?.isActive) return null;
    const stamps = await this.stampsSinceLastReward(customerId, restaurantId);
    return {
      stamps,
      visitsRequired: card.visitsRequired,
      ready: stamps >= card.visitsRequired,
      rewardEn: card.rewardEn,
      rewardAr: card.rewardAr,
    };
  }

  // Staff hand the reward over. Only for a customer whose code was scanned
  // here today, so a customer id alone can't be used from afar.
  async redeem(partner: PartnerJwtPayload, customerId: string, now = new Date()) {
    const restaurantId = partner.sub;
    const visitedToday = await this.prisma.db.customerVisit.findUnique({
      where: { customerId_restaurantId_visitDate: { customerId, restaurantId, visitDate: baghdadClock(now).date } },
      select: { id: true },
    });
    if (!visitedToday) throw new BadRequestException('Scan the customer\'s visit code first');
    const progress = await this.progress(customerId, restaurantId);
    if (!progress) throw new BadRequestException('The stamp card is switched off');
    if (!progress.ready) throw new BadRequestException('Not enough stamps yet');
    await this.prisma.db.stampReward.create({
      data: {
        restaurantId,
        customerId,
        rewardEn: progress.rewardEn,
        rewardAr: progress.rewardAr,
        redeemedByStaffId: partner.staffId ?? null,
      },
    });
    return { ...progress, stamps: 0, ready: false, redeemed: true };
  }

  // Customer app: "My stamp cards" - every restaurant with a card that the
  // customer has visited, closest to a reward first.
  async customerCards(customerId: string) {
    const visited = await this.prisma.db.customerVisit.findMany({
      where: { customerId, restaurant: { stampCard: { isActive: true } } },
      distinct: ['restaurantId'],
      select: { restaurantId: true },
    });
    if (!visited.length) return [];
    const ids = visited.map((v) => v.restaurantId);
    const restaurants = await this.prisma.db.restaurant.findMany({
      where: { id: { in: ids } },
      select: { id: true, nameEn: true, nameAr: true, logoUrl: true },
    });
    const cards = await Promise.all(
      restaurants.map(async (restaurant) => {
        const progress = await this.progress(customerId, restaurant.id);
        return progress ? { restaurant, ...progress } : null;
      }),
    );
    return cards
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => Number(b.ready) - Number(a.ready) || b.stamps / b.visitsRequired - a.stamps / a.visitsRequired);
  }

  private async stampsSinceLastReward(customerId: string, restaurantId: string): Promise<number> {
    const last = await this.prisma.db.stampReward.findFirst({
      where: { customerId, restaurantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return this.prisma.db.customerVisit.count({
      where: { customerId, restaurantId, ...(last ? { createdAt: { gt: last.createdAt } } : {}) },
    });
  }
}
