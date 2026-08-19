import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminJwtPayload, AppJwtPayload } from '../jwt-payload';

@Injectable()
export class AdminAuthGuard extends JwtAuthGuard {
  constructor(protected readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AppJwtPayload;
    if (user.type !== 'admin') {
      throw new UnauthorizedException('Admin account required');
    }

    // Re-check against the DB so a deactivated or role-downgraded admin's
    // existing token stops working (or loses elevated access) immediately,
    // instead of staying valid for the rest of its lifetime.
    const admin = user as AdminJwtPayload;
    const record = await this.prisma.db.adminUser.findUnique({
      where: { id: admin.sub },
      select: { isActive: true, role: true, tokenVersion: true },
    });
    if (!record || !record.isActive || record.tokenVersion !== admin.tokenVersion) {
      throw new UnauthorizedException('Session is no longer valid, please sign in again');
    }
    admin.adminRole = record.role;
    return true;
  }
}
