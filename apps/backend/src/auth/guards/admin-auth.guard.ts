import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminJwtPayload, AppJwtPayload } from '../jwt-payload';
import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER, ADMIN_TOKEN_COOKIE } from '../../common/adminAuthCookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

    // CSRF check - only relevant when this request is using the browser
    // cookie (the admin portal); the partner app's header-based tokens
    // aren't cookies, so a forged cross-site request can never carry them
    // automatically the way a cookie is. sameSite: 'none' on the auth
    // cookie (required since the portal and this API are different sites)
    // means the browser *would* attach it to a forged request from anywhere
    // - this check is what actually stops that forged request from
    // succeeding, since forging a matching header requires reading a cookie
    // the forging site was never allowed to read.
    if (request.cookies?.[ADMIN_TOKEN_COOKIE] && !SAFE_METHODS.has(request.method)) {
      const csrfCookie = request.cookies?.[ADMIN_CSRF_COOKIE];
      const csrfHeader = request.headers?.[ADMIN_CSRF_HEADER];
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        throw new UnauthorizedException('Missing or invalid CSRF token');
      }
    }

    return true;
  }
}
