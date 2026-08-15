import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AppJwtPayload } from '../jwt-payload';

@Injectable()
export class AdminAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ok = await super.canActivate(context);
    if (!ok) return false;
    const request = context.switchToHttp().getRequest();
    const user = request.user as AppJwtPayload;
    if (user.type !== 'admin') {
      throw new UnauthorizedException('Admin account required');
    }
    return true;
  }
}
