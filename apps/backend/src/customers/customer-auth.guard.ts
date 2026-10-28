import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { customerTokenSecret } from './customer-secrets';
import type { CustomerJwtPayload } from './customer-auth.service';

export interface CustomerRequest extends Request {
  customer: { id: string };
}

// Customer-app routes. Verifies with the customer key (see
// customer-secrets.ts), so partner/admin tokens never pass here and
// customer tokens never pass there. Re-checks the account on every request
// so a deleted account or "sign out everywhere" takes effect immediately.
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Please sign in');

    let payload: CustomerJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerJwtPayload>(token, { secret: customerTokenSecret() });
    } catch {
      throw new UnauthorizedException('Please sign in again');
    }
    if (payload.type !== 'customer') throw new UnauthorizedException('Please sign in again');

    const customer = await this.prisma.db.customer.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });
    if (!customer || customer.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Please sign in again');
    }
    request.customer = { id: payload.sub };
    return true;
  }
}
