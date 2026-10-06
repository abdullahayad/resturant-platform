import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PartnerJwtPayload } from '../auth/jwt-payload';
import type { FieldChange } from './diff-fields';

export interface LogActivityParams {
  restaurantId: string;
  // One of the partner-app's own ScreenKey values (profile, menu, gallery,
  // promotions, advertising, chefManagement, chefTable, reviews,
  // reservations, announcements, settings) - see nav.ts in the partner app.
  section: string;
  summary: string;
  changes?: FieldChange[];
  user: PartnerJwtPayload;
}

@Injectable()
export class RestaurantActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget from the caller's perspective (awaited, but never
  // expected to fail in a way that should roll back the real mutation it's
  // describing) - every call site awaits this after its own write already
  // succeeded, so a logging bug never blocks a restaurant's actual action.
  log(params: LogActivityParams) {
    return this.prisma.db.restaurantActivityLog.create({
      data: {
        restaurantId: params.restaurantId,
        section: params.section,
        summary: params.summary,
        changes: params.changes && params.changes.length > 0 ? (params.changes as object) : undefined,
        staffId: params.user.staffId ?? null,
        impersonatedByAdminId: params.user.impersonatedBy ?? null,
      },
    });
  }
}
