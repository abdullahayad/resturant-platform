import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppJwtPayload, PartnerJwtPayload } from '../jwt-payload';

@Injectable()
export class PartnerAuthGuard extends JwtAuthGuard {
  constructor(protected readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AppJwtPayload;
    if (user.type !== 'partner') {
      throw new UnauthorizedException('Partner account required');
    }

    // Re-check tokenVersion against the DB so a token issued before a
    // password change stops working immediately instead of staying valid
    // for the rest of its lifetime.
    const partner = user as PartnerJwtPayload;
    const restaurant = await this.prisma.db.restaurant.findUnique({
      where: { id: partner.sub },
      select: { tokenVersion: true },
    });
    if (!restaurant || restaurant.tokenVersion !== partner.tokenVersion) {
      throw new UnauthorizedException('Session is no longer valid, please sign in again');
    }
    return true;
  }
}
