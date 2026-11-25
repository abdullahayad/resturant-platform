import { Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import { baghdadClock } from '../common/baghdadTime';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';

export const CONFIRM_EVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;
const PUSH_CHUNK = 50;

interface Baseline {
  infoConfirmedAt: Date | null;
  publishReviewedAt: Date | null;
  createdAt: Date;
}

// Until the first confirmation, the admin's publish review counts as the
// last time someone checked the info.
function checkedAt(r: Baseline): Date {
  return r.infoConfirmedAt ?? r.publishReviewedAt ?? r.createdAt;
}

// Live restaurants whose info was last checked before `cutoff`.
function dueWhere(cutoff: Date): Prisma.RestaurantWhereInput {
  return {
    status: 'APPROVED',
    publishStatus: 'APPROVED',
    OR: [
      { infoConfirmedAt: { lte: cutoff } },
      { infoConfirmedAt: null, publishReviewedAt: { lte: cutoff } },
      { infoConfirmedAt: null, publishReviewedAt: null, createdAt: { lte: cutoff } },
    ],
  };
}

// "Is your info still correct?": every 30 days a live restaurant is asked
// to confirm its menu, prices and hours (a card in the partner app, plus a
// push), so customers don't see outdated details.
@Injectable()
export class InfoCheckService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InfoCheckService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  // No scheduler here: an hourly check is enough, and whatever is missed
  // while the server sleeps is picked up by a later one.
  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      this.sendReminders().catch((e: unknown) => this.logger.error(`Info reminders failed: ${String(e)}`));
    }, CHECK_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async status(restaurantId: string, now = new Date()) {
    const r = await this.prisma.db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true, publishStatus: true, infoConfirmedAt: true, publishReviewedAt: true, createdAt: true },
    });
    if (!r) throw new NotFoundException('Restaurant not found');
    const live = r.status === 'APPROVED' && r.publishStatus === 'APPROVED';
    return {
      due: live && now.getTime() - checkedAt(r).getTime() >= CONFIRM_EVERY_DAYS * DAY_MS,
      lastCheckedAt: checkedAt(r),
    };
  }

  async confirm(user: PartnerJwtPayload, now = new Date()) {
    await this.prisma.db.restaurant.update({ where: { id: user.sub }, data: { infoConfirmedAt: now } });
    await this.activityLog.log({
      restaurantId: user.sub,
      section: 'profile',
      summary: 'Confirmed the menu, prices and opening hours are correct',
      user,
    });
    return { due: false, lastCheckedAt: now };
  }

  async overdue(now = new Date()) {
    const rows = await this.prisma.db.restaurant.findMany({
      where: dueWhere(new Date(now.getTime() - CONFIRM_EVERY_DAYS * DAY_MS)),
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        phone: true,
        infoConfirmedAt: true,
        publishReviewedAt: true,
        createdAt: true,
      },
    });
    return rows
      .map((r) => ({
        id: r.id,
        nameEn: r.nameEn,
        nameAr: r.nameAr,
        phone: r.phone,
        everConfirmed: r.infoConfirmedAt != null,
        days: Math.floor((now.getTime() - checkedAt(r).getTime()) / DAY_MS),
      }))
      .sort((a, b) => b.days - a.days);
  }

  // At most one push per restaurant every 30 days, in the daytime.
  async sendReminders(now = new Date()): Promise<number> {
    const { time } = baghdadClock(now);
    if (time < '11:00' || time >= '19:00') return 0;
    const cutoff = new Date(now.getTime() - CONFIRM_EVERY_DAYS * DAY_MS);
    const notRecently = { OR: [{ infoReminderSentAt: null }, { infoReminderSentAt: { lte: cutoff } }] };
    const due = await this.prisma.db.restaurant.findMany({
      where: { AND: [dueWhere(cutoff), notRecently] },
      select: { id: true },
    });

    // Claimed one by one before sending, so two servers running during a
    // deploy can't both remind the same restaurant.
    const claimed: string[] = [];
    for (const { id } of due) {
      const { count } = await this.prisma.db.restaurant.updateMany({
        where: { id, ...notRecently },
        data: { infoReminderSentAt: now },
      });
      if (count) claimed.push(id);
    }
    for (let i = 0; i < claimed.length; i += PUSH_CHUNK) {
      // Both languages: the server doesn't know which one the phone uses.
      await this.push.sendToRestaurants(
        claimed.slice(i, i + PUSH_CHUNK),
        'هل معلومات مطعمك صحيحة؟ · Is your info correct?',
        'تأكد من القائمة والأسعار وأوقات العمل. Check your menu, prices and hours.',
        { screen: 'dashboard' },
      );
    }
    return claimed.length;
  }
}
