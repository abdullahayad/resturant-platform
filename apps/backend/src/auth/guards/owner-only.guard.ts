import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PartnerAuthGuard } from './partner-auth.guard';
import type { PartnerJwtPayload } from '../jwt-payload';

// Blocks every staff login regardless of role. Used for routes that touch
// the restaurant owner's own login credentials.
@Injectable()
export class OwnerOnlyGuard extends PartnerAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as PartnerJwtPayload;
    if (user.staffId) {
      throw new ForbiddenException('Restaurant owner only');
    }
    return true;
  }
}
