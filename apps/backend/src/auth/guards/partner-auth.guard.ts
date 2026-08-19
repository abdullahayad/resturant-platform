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

    const partner = user as PartnerJwtPayload;
    if (partner.staffId) {
      // Staff login: re-check live status/role/restaurant so a deactivated
      // or reassigned staff account stops working immediately instead of
      // staying valid for the rest of the token's lifetime.
      const staff = await this.prisma.db.partnerStaffUser.findUnique({
        where: { id: partner.staffId },
        select: { isActive: true, role: true, restaurantId: true },
      });
      if (!staff || !staff.isActive || staff.restaurantId !== partner.sub || staff.role === 'OWNER') {
        // OWNER is reserved for the restaurant's own login and is never
        // assigned to a PartnerStaffUser row (see staff/dto/staff.dto.ts);
        // seeing it here would mean the invariant broke somewhere.
        throw new UnauthorizedException('Session is no longer valid, please sign in again');
      }
      partner.staffRole = staff.role;
    } else {
      // Owner login: re-check tokenVersion so a token issued before a
      // password change stops working immediately instead of staying valid
      // for the rest of its lifetime.
      const restaurant = await this.prisma.db.restaurant.findUnique({
        where: { id: partner.sub },
        select: { tokenVersion: true },
      });
      if (!restaurant || restaurant.tokenVersion !== partner.tokenVersion) {
        throw new UnauthorizedException('Session is no longer valid, please sign in again');
      }
    }
    return true;
  }
}
