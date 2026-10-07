import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

@Injectable()
export class VerificationDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
  ) {}

  list(restaurantId: string) {
    return this.prisma.db.verificationDocument.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(restaurantId: string, url: string, user: PartnerJwtPayload) {
    // The DTO only checks the URL is on our storage host - it can't tell
    // whose upload it was. Refuse a file another restaurant already
    // submitted, so one business's license can't be passed off as another's.
    const existing = await this.prisma.db.verificationDocument.findFirst({
      where: { url },
      select: { restaurantId: true },
    });
    if (existing && existing.restaurantId !== restaurantId) {
      throw new ConflictException('This document has already been submitted by another restaurant');
    }
    const doc = await this.prisma.db.verificationDocument.create({ data: { restaurantId, url } });
    await this.activityLog.log({ restaurantId, section: 'settings', summary: 'Submitted a verification document', user });
    return doc;
  }

  async remove(restaurantId: string, id: string, user: PartnerJwtPayload) {
    const doc = await this.prisma.db.verificationDocument.findUnique({ where: { id } });
    if (!doc || doc.restaurantId !== restaurantId) throw new NotFoundException('Document not found');
    await this.prisma.db.verificationDocument.delete({ where: { id } });
    await this.activityLog.log({ restaurantId, section: 'settings', summary: 'Removed a verification document', user });
    return { id };
  }
}
