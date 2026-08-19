import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PartnerAuthGuard } from './partner-auth.guard';
import type { PartnerJwtPayload } from '../jwt-payload';

// Blocks MENU_EDITOR staff from sections outside their scope (Profile &
// Info, Chef Table & Events, Settings & Staff). The restaurant owner and
// MANAGER staff pass through unaffected.
@Injectable()
export class ManagerOrOwnerGuard extends PartnerAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as PartnerJwtPayload;
    if (user.staffRole === 'MENU_EDITOR') {
      throw new ForbiddenException('Managers and the restaurant owner only');
    }
    return true;
  }
}
