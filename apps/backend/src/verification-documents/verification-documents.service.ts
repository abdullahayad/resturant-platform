import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantActivityLogService } from '../restaurant-activity-log/restaurant-activity-log.service';
import { StorageService } from '../uploads/storage.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';

interface StoredDocument {
  id: string;
  storageKey: string | null;
  url: string | null;
  createdAt: Date;
}

@Injectable()
export class VerificationDocumentsService {
  private readonly logger = new Logger(VerificationDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: RestaurantActivityLogService,
    private readonly storage: StorageService,
  ) {}

  async list(restaurantId: string) {
    const docs = await this.prisma.db.verificationDocument.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(docs.map((doc) => this.present(doc)));
  }

  // Business licenses live in the private bucket, so the server uploads
  // them itself and mints the key - callers never pick a URL, which also
  // rules out submitting another restaurant's file as your own.
  async create(restaurantId: string, file: { buffer: Buffer; originalname: string }, user: PartnerJwtPayload) {
    const { key } = await this.storage.uploadPrivate(file, `verification-documents/${restaurantId}`);
    const doc = await this.prisma.db.verificationDocument.create({ data: { restaurantId, storageKey: key } });
    await this.activityLog.log({ restaurantId, section: 'settings', summary: 'Submitted a verification document', user });
    return this.present(doc);
  }

  async remove(restaurantId: string, id: string, user: PartnerJwtPayload) {
    const doc = await this.prisma.db.verificationDocument.findUnique({ where: { id } });
    if (!doc || doc.restaurantId !== restaurantId) throw new NotFoundException('Document not found');
    await this.prisma.db.verificationDocument.delete({ where: { id } });
    if (doc.storageKey) {
      // The row is already gone, so a failed object delete only leaves an
      // unreachable private file behind - log it rather than fail the request.
      await this.storage.deletePrivate(doc.storageKey).catch((err) => {
        this.logger.warn(`Could not delete stored document ${doc.storageKey}: ${String(err)}`);
      });
    }
    await this.activityLog.log({ restaurantId, section: 'settings', summary: 'Removed a verification document', user });
    return { id };
  }

  private async present(doc: StoredDocument) {
    const url = doc.storageKey ? await this.storage.signedUrl(doc.storageKey) : doc.url;
    return { id: doc.id, url, createdAt: doc.createdAt };
  }
}
