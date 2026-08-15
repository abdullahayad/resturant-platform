import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import type { AdminJwtPayload } from '../jwt-payload';

@Injectable()
export class SuperAdminGuard extends AdminAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AdminJwtPayload;
    if (user.adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin required');
    }
    return true;
  }
}
