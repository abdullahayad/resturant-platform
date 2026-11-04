import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageOffset } from '../common/pagination';

// Mirror prisma/schema.prisma's enums.
export const REPORT_REASONS = ['FAKE_REVIEW', 'ABUSIVE', 'SPAM', 'UNDISCLOSED_PAID', 'OTHER'] as const;
export type ReportReasonValue = (typeof REPORT_REASONS)[number];
export const REPORT_STATUSES = ['OPEN', 'DISMISSED', 'ACTIONED'] as const;
export type ReportStatusValue = (typeof REPORT_STATUSES)[number];
export const REPORT_ACTIONS = ['DISMISS', 'HIDE_REVIEW', 'BLOCK_CUSTOMER'] as const;
export type ReportActionValue = (typeof REPORT_ACTIONS)[number];

const restaurantMini = { select: { id: true, nameEn: true, nameAr: true } } as const;

// Reported reviews: customers report from the customer app, restaurants
// report reviews about themselves from the partner app, and an admin
// dismisses, hides the review, or blocks its author.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async reportByCustomer(customerId: string, reviewId: string, reason: ReportReasonValue, note?: string) {
    const review = await this.findReview(reviewId);
    if (review.customerId === customerId) throw new BadRequestException("You can't report your own review");
    return this.create({
      reviewId,
      reason,
      note,
      reporterCustomerId: customerId,
      reportedCustomerId: review.customerId,
    });
  }

  async reportByRestaurant(restaurantId: string, reviewId: string, reason: ReportReasonValue, note?: string) {
    const review = await this.findReview(reviewId);
    if (review.restaurantId !== restaurantId) throw new NotFoundException('Review not found');
    return this.create({
      reviewId,
      reason,
      note,
      reporterRestaurantId: restaurantId,
      reportedCustomerId: review.customerId,
    });
  }

  async adminList(status: ReportStatusValue | undefined, pageParam?: number) {
    const { page, skip, take } = pageOffset(pageParam);
    const where = status ? { status } : {};
    const [items, total, counts] = await Promise.all([
      this.prisma.db.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          reason: true,
          note: true,
          status: true,
          resolution: true,
          resolvedAt: true,
          createdAt: true,
          resolvedBy: { select: { fullName: true } },
          reporterCustomer: { select: { id: true, name: true, phone: true } },
          reporterRestaurant: restaurantMini,
          reportedCustomer: { select: { id: true, name: true, phone: true, blockedAt: true } },
          review: {
            select: {
              id: true,
              reviewerName: true,
              rating: true,
              text: true,
              createdAt: true,
              moderationStatus: true,
              restaurant: restaurantMini,
              _count: { select: { reports: true } },
            },
          },
        },
      }),
      this.prisma.db.report.count({ where }),
      this.prisma.db.report.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const statusCounts = Object.fromEntries(REPORT_STATUSES.map((s) => [s, 0])) as Record<ReportStatusValue, number>;
    for (const c of counts) statusCounts[c.status] = c._count._all;
    return { items, total, page, pageSize: take, statusCounts };
  }

  // Hiding the review or blocking its author settles every open report
  // about that review at once; dismissing settles only this one.
  async adminResolve(reportId: string, adminId: string, action: ReportActionValue, note?: string) {
    const report = await this.prisma.db.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, reviewId: true, reason: true, reportedCustomerId: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    const resolution = note?.trim() || null;
    const resolved = { resolvedById: adminId, resolvedAt: new Date(), resolution };

    if (action === 'DISMISS') {
      await this.prisma.db.report.update({ where: { id: reportId }, data: { status: 'DISMISSED', ...resolved } });
      return { id: reportId, status: 'DISMISSED' as const };
    }
    if (action === 'BLOCK_CUSTOMER' && !report.reportedCustomerId) {
      throw new BadRequestException('This review was not written from a customer account, so there is no one to block');
    }

    await this.prisma.db.$transaction([
      this.prisma.db.review.update({ where: { id: report.reviewId }, data: { moderationStatus: 'HIDDEN' } }),
      ...(action === 'BLOCK_CUSTOMER'
        ? [
            this.prisma.db.customer.update({
              where: { id: report.reportedCustomerId! },
              data: {
                blockedAt: new Date(),
                blockedById: adminId,
                blockedReason: resolution ?? `Reported review (${report.reason})`,
              },
            }),
          ]
        : []),
      this.prisma.db.report.updateMany({
        where: { reviewId: report.reviewId, status: 'OPEN' },
        data: { status: 'ACTIONED', ...resolved },
      }),
    ]);
    return { id: reportId, status: 'ACTIONED' as const };
  }

  // The same reporter reporting the same review again just gets their
  // existing open report back.
  private async create(data: {
    reviewId: string;
    reason: ReportReasonValue;
    note?: string;
    reporterCustomerId?: string;
    reporterRestaurantId?: string;
    reportedCustomerId: string | null;
  }) {
    const existing = await this.prisma.db.report.findFirst({
      where: {
        reviewId: data.reviewId,
        status: 'OPEN',
        ...(data.reporterCustomerId
          ? { reporterCustomerId: data.reporterCustomerId }
          : { reporterRestaurantId: data.reporterRestaurantId }),
      },
      select: { id: true, status: true },
    });
    if (existing) return existing;
    return this.prisma.db.report.create({
      data: { ...data, note: data.note?.trim() || null },
      select: { id: true, status: true },
    });
  }

  private async findReview(reviewId: string) {
    const review = await this.prisma.db.review.findUnique({
      where: { id: reviewId },
      select: { id: true, restaurantId: true, customerId: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}
