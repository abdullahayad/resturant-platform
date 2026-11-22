import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PartnerJwtPayload } from '../jwt-payload';
import { ApprovedPartnerGuard } from './approved-partner.guard';

// New restaurants can set up everything as soon as they register, but
// actions that reach customers (recording visits / stamp rewards, paid
// Featured placements) wait until an admin has approved publishing - the
// one real review, where the menu, photos and location are checked.
@Injectable()
export class PublishedPartnerGuard extends ApprovedPartnerGuard {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await super.canActivate(context))) return false;
    const user = context.switchToHttp().getRequest().user as PartnerJwtPayload;
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: user.sub },
      select: { publishStatus: true },
    });
    if (restaurant?.publishStatus !== 'APPROVED') {
      throw new ForbiddenException('Available once your restaurant is approved and published');
    }
    return true;
  }
}
