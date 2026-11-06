import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { pageOffset } from '../common/pagination';
import { levelFor } from './customer-levels';
import type { HomeBannerLinkValue } from '../home-banners/home-banners.dto';

// At most this many campaign pushes per customer in any 7 days, so people
// don't switch notifications off.
export const WEEKLY_CAMPAIGN_LIMIT = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface CampaignAudience {
  minLevel?: number;
  followersOfRestaurantId?: string;
}

export interface CampaignInput extends CampaignAudience {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  linkType?: HomeBannerLinkValue;
  linkValue?: string | null;
}

// What the app opens when the push is tapped (same targets as Home banners).
function linkData(linkType: HomeBannerLinkValue = 'NONE', linkValue?: string | null): Record<string, string> {
  if (linkType === 'RESTAURANT' && linkValue) return { screen: 'restaurant', id: linkValue };
  if (linkType === 'MOOD' && linkValue) return { screen: 'mood', id: linkValue };
  if (linkType === 'HEALTHY') return { screen: 'healthy' };
  if (linkType === 'OFFERS') return { screen: 'offers' };
  if (linkType === 'EVENTS') return { screen: 'events' };
  return { screen: 'home' };
}

// Admin > App > Push Campaigns: send a push to customers who allow
// campaigns, optionally narrowed by level or by who follows a restaurant.
@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  // Who would get it right now: allows campaigns, not blocked, has the app
  // with notifications on, matches the filters, and is under the weekly limit.
  async audience(filters: CampaignAudience, now = new Date()): Promise<string[]> {
    const customers = await this.prisma.db.customer.findMany({
      where: {
        notifyCampaigns: true,
        blockedAt: null,
        pushTokens: { some: {} },
        ...(filters.followersOfRestaurantId
          ? { follows: { some: { restaurantId: filters.followersOfRestaurantId } } }
          : {}),
      },
      select: { id: true },
    });
    let ids = customers.map((c) => c.id);
    if (!ids.length) return [];

    if (filters.minLevel && filters.minLevel > 1) {
      const visits = await this.prisma.db.customerVisit.groupBy({
        by: ['customerId'],
        where: { customerId: { in: ids } },
        _count: { _all: true },
      });
      const count = new Map(visits.map((v) => [v.customerId, v._count._all]));
      ids = ids.filter((id) => levelFor(count.get(id) ?? 0).level >= filters.minLevel!);
    }

    const recent = await this.prisma.db.customerCampaignDelivery.groupBy({
      by: ['customerId'],
      where: { customerId: { in: ids }, sentAt: { gte: new Date(now.getTime() - WEEK_MS) } },
      _count: { _all: true },
    });
    const capped = new Set(recent.filter((r) => r._count._all >= WEEKLY_CAMPAIGN_LIMIT).map((r) => r.customerId));
    return ids.filter((id) => !capped.has(id));
  }

  async preview(filters: CampaignAudience) {
    return { customers: (await this.audience(filters)).length, weeklyLimit: WEEKLY_CAMPAIGN_LIMIT };
  }

  async send(input: CampaignInput, adminId: string) {
    if ((input.linkType === 'RESTAURANT' || input.linkType === 'MOOD') && !input.linkValue) {
      throw new BadRequestException('Choose which restaurant or mood the push opens');
    }
    const ids = await this.audience(input);
    if (!ids.length) throw new BadRequestException('Nobody matches this audience right now');
    const campaign = await this.prisma.db.customerCampaign.create({
      data: {
        titleEn: input.titleEn.trim(),
        titleAr: input.titleAr.trim(),
        bodyEn: input.bodyEn.trim(),
        bodyAr: input.bodyAr.trim(),
        linkType: input.linkType ?? 'NONE',
        linkValue: input.linkValue ?? null,
        minLevel: input.minLevel ?? null,
        followersOfRestaurantId: input.followersOfRestaurantId ?? null,
        recipientCount: ids.length,
        sentById: adminId,
        deliveries: { createMany: { data: ids.map((customerId) => ({ customerId })) } },
      },
      select: { id: true, recipientCount: true },
    });
    await this.push.sendToCustomers(ids, input, linkData(input.linkType, input.linkValue));
    return campaign;
  }

  async history(pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const [items, total] = await Promise.all([
      this.prisma.db.customerCampaign.findMany({
        orderBy: { sentAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          bodyEn: true,
          bodyAr: true,
          linkType: true,
          minLevel: true,
          followersOfRestaurantId: true,
          recipientCount: true,
          sentAt: true,
          sentBy: { select: { fullName: true } },
        },
      }),
      this.prisma.db.customerCampaign.count(),
    ]);
    return { items, total, page, pageSize: take };
  }
}
