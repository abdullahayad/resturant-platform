import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PAGE_SIZE, pageOffset } from '../common/pagination';
import type { AdminActivitySection, RestaurantActivitySection } from '../restaurant-activity-log/sections';

// Same merge-then-slice approach as the restaurant-facing ActivityService -
// see that file's comment for why a merged multi-table feed can't use a
// plain per-source skip/take. Only used for the unfiltered "All" view now;
// a single section (including the single RestaurantActivityLog table that
// covers every restaurant section) is a plain indexed skip/take below.
const MAX_FETCH_PER_SOURCE = 400;

// Window for the nav sidebar's red badge - a blocked upload from months ago
// isn't "new," so a plain all-time count would never go back down and stop
// meaning anything. 24h keeps the badge reflecting genuinely recent activity.
const RECENT_BLOCKED_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RestaurantSummary {
  id: string;
  nameEn: string;
  nameAr: string;
  codeNumber: string;
}

export interface ActivityChange {
  field: string;
  from: unknown;
  to: unknown;
}

// One item per restaurant self-service change (any section), plus the two
// admin-side exceptions that were always here: a blocked upload (something
// ModerationService stopped) and an admin "Manage as this restaurant"
// session (an admin accessing the account directly, not the restaurant
// acting on its own).
export type AdminActivityItem =
  | {
      type: 'restaurantActivity';
      id: string;
      createdAt: Date;
      section: RestaurantActivitySection;
      summary: string;
      changes: ActivityChange[] | null;
      restaurant: RestaurantSummary;
      actor: { kind: 'owner' | 'staff' | 'admin'; name: string | null };
    }
  // restaurant is null only for the rare case of an admin's own upload
  // getting blocked (see uploads/moderation.service.ts).
  | { type: 'blockedUpload'; id: string; createdAt: Date; originalName: string; restaurant: RestaurantSummary | null }
  // A "Manage as this restaurant" session an admin started - see
  // AdminSupportSession's comment in schema.prisma.
  | { type: 'adminSupportSession'; id: string; createdAt: Date; adminName: string; restaurant: RestaurantSummary };

const restaurantSummarySelect = { id: true, nameEn: true, nameAr: true, codeNumber: true } as const;

function resolveActor(row: {
  staff: { fullName: string } | null;
  impersonatedByAdmin: { fullName: string } | null;
}): { kind: 'owner' | 'staff' | 'admin'; name: string | null } {
  if (row.staff) return { kind: 'staff', name: row.staff.fullName };
  if (row.impersonatedByAdmin) return { kind: 'admin', name: row.impersonatedByAdmin.fullName };
  return { kind: 'owner', name: null };
}

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async recentActivity(pageParam?: number, section?: AdminActivitySection) {
    const page = pageParam && pageParam > 0 ? pageParam : 1;

    if (section === 'blockedUpload') return this.blockedUploadsPage(page);
    if (section === 'adminSupportSession') return this.supportSessionsPage(page);
    if (section) return this.restaurantActivityPage(page, section);
    return this.allSectionsPage(page);
  }

  private async restaurantActivityPage(page: number, section: RestaurantActivitySection) {
    const where = { section };
    const { skip, take } = pageOffset(page);
    const [rows, total] = await Promise.all([
      this.prisma.db.restaurantActivityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          restaurant: { select: restaurantSummarySelect },
          staff: { select: { fullName: true } },
          impersonatedByAdmin: { select: { fullName: true } },
        },
      }),
      this.prisma.db.restaurantActivityLog.count({ where }),
    ]);
    const items: AdminActivityItem[] = rows.map((r) => ({
      type: 'restaurantActivity',
      id: r.id,
      createdAt: r.createdAt,
      section: r.section as RestaurantActivitySection,
      summary: r.summary,
      changes: (r.changes as ActivityChange[] | null) ?? null,
      restaurant: r.restaurant,
      actor: resolveActor(r),
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  private async blockedUploadsPage(page: number) {
    const { skip, take } = pageOffset(page);
    const [rows, total] = await Promise.all([
      this.prisma.db.blockedUpload.findMany({
        select: { id: true, originalName: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.blockedUpload.count(),
    ]);
    const items: AdminActivityItem[] = rows.map((b) => ({
      type: 'blockedUpload',
      id: b.id,
      createdAt: b.createdAt,
      originalName: b.originalName,
      restaurant: b.restaurant,
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  private async supportSessionsPage(page: number) {
    const { skip, take } = pageOffset(page);
    const [rows, total] = await Promise.all([
      this.prisma.db.adminSupportSession.findMany({
        select: { id: true, createdAt: true, admin: { select: { fullName: true } }, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.db.adminSupportSession.count(),
    ]);
    const items: AdminActivityItem[] = rows.map((s) => ({
      type: 'adminSupportSession',
      id: s.id,
      createdAt: s.createdAt,
      adminName: s.admin.fullName,
      restaurant: s.restaurant,
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  // Merges all three sources for the unfiltered "All" view - a genuine
  // simplification over the old 6-source merge, since dish/photo/promotion/
  // event creation now live in RestaurantActivityLog under their own
  // sections instead of being queried separately.
  private async allSectionsPage(page: number) {
    const fetchCount = Math.min(page * PAGE_SIZE, MAX_FETCH_PER_SOURCE);

    const [activity, blockedUploads, supportSessions, activityTotal, blockedUploadTotal, supportSessionTotal] = await Promise.all([
      this.prisma.db.restaurantActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
        include: {
          restaurant: { select: restaurantSummarySelect },
          staff: { select: { fullName: true } },
          impersonatedByAdmin: { select: { fullName: true } },
        },
      }),
      this.prisma.db.blockedUpload.findMany({
        select: { id: true, originalName: true, createdAt: true, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.adminSupportSession.findMany({
        select: { id: true, createdAt: true, admin: { select: { fullName: true } }, restaurant: { select: restaurantSummarySelect } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
      }),
      this.prisma.db.restaurantActivityLog.count(),
      this.prisma.db.blockedUpload.count(),
      this.prisma.db.adminSupportSession.count(),
    ]);

    const merged: AdminActivityItem[] = [
      ...activity.map(
        (r): AdminActivityItem => ({
          type: 'restaurantActivity',
          id: r.id,
          createdAt: r.createdAt,
          section: r.section as RestaurantActivitySection,
          summary: r.summary,
          changes: (r.changes as ActivityChange[] | null) ?? null,
          restaurant: r.restaurant,
          actor: resolveActor(r),
        }),
      ),
      ...blockedUploads.map(
        (b): AdminActivityItem => ({ type: 'blockedUpload', id: b.id, createdAt: b.createdAt, originalName: b.originalName, restaurant: b.restaurant }),
      ),
      ...supportSessions.map(
        (s): AdminActivityItem => ({ type: 'adminSupportSession', id: s.id, createdAt: s.createdAt, adminName: s.admin.fullName, restaurant: s.restaurant }),
      ),
    ];
    merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (page - 1) * PAGE_SIZE;
    const items = merged.slice(start, start + PAGE_SIZE);
    const total = activityTotal + blockedUploadTotal + supportSessionTotal;
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  // Drives the red badge on the Recent Activity nav item - see
  // RECENT_BLOCKED_WINDOW_MS above for why this is a rolling window rather
  // than an all-time count.
  async recentBlockedCount() {
    const count = await this.prisma.db.blockedUpload.count({
      where: { createdAt: { gte: new Date(Date.now() - RECENT_BLOCKED_WINDOW_MS) } },
    });
    return { count };
  }
}
