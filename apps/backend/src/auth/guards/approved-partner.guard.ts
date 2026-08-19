import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PartnerAuthGuard } from './partner-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { PartnerJwtPayload } from '../jwt-payload';

// PartnerAuthGuard only checks the JWT is well-formed — it never re-checks
// the restaurant's current status, so a suspended/rejected/still-pending
// owner's existing token kept working for every mutating route (see
// security review). This re-reads status from the DB on every request
// rather than trusting the stale value baked into the token at login.
@Injectable()
export class ApprovedPartnerGuard extends PartnerAuthGuard {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user as PartnerJwtPayload;
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: user.sub },
      select: { status: true },
    });
    if (!restaurant || restaurant.status !== 'APPROVED') {
      throw new ForbiddenException('This action is not available while your restaurant is not approved');
    }
    return true;
  }
}
